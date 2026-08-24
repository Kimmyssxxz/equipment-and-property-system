import { NextResponse } from 'next/server';
import { getServiceSupabase, getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

function getClient() {
  const service = getServiceSupabase();
  if (service) return service;
  return getSupabaseClient();
}

// GET: Fetch System Settings and Signatories from Supabase
export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Database is not configured yet.', configured: false },
        { status: 500 }
      );
    }

    const supabase = getClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Failed to initialize database client.' },
        { status: 500 }
      );
    }

    let settingsMap = {};

    // 1. Fetch structured organization_settings table
    const { data: orgRows, error: orgErr } = await supabase
      .from('organization_settings')
      .select('*')
      .limit(1);

    if (!orgErr && Array.isArray(orgRows) && orgRows.length > 0) {
      settingsMap = orgRows[0];
    } else {
      // Legacy Fallback: system_settings
      const { data: settingsRows } = await supabase
        .from('system_settings')
        .select('*');

      if (Array.isArray(settingsRows)) {
        const orgInfoRow = settingsRows.find((r) => r.key === 'organization_info');
        if (orgInfoRow) {
          try {
            settingsMap = typeof orgInfoRow.value === 'string' ? JSON.parse(orgInfoRow.value) : orgInfoRow.value;
          } catch (e) {}
        }
        settingsRows.forEach((row) => {
          if (row.key !== 'organization_info' && row.key !== 'signatories_config') {
            try {
              settingsMap[row.key] = JSON.parse(row.value);
            } catch (e) {
              settingsMap[row.key] = row.value;
            }
          }
        });
      }
    }

    // 2. Fetch report_signatories records
    const { data: sigRows } = await supabase
      .from('report_signatories')
      .select('*')
      .order('order', { ascending: true });

    let signatoriesObj = null;
    if (Array.isArray(sigRows) && sigRows.length > 0) {
      signatoriesObj = {};
      sigRows.forEach((row) => {
        if (row.roleKey === 'preparedBy') {
          signatoriesObj.preparedByName = row.name;
          signatoriesObj.preparedByTitle = row.title;
        } else if (row.roleKey === 'certifiedCorrectBy') {
          signatoriesObj.certifiedCorrectByName = row.name;
          signatoriesObj.certifiedCorrectByTitle = row.title;
        } else if (row.roleKey === 'teamLeader') {
          signatoriesObj.teamLeaderName = row.name;
          signatoriesObj.teamLeaderTitle = row.title;
        } else if (row.roleKey === 'approvedBy') {
          signatoriesObj.approvedByName = row.name;
          signatoriesObj.approvedByTitle = row.title;
        } else if (row.roleKey === 'verifiedBy') {
          signatoriesObj.verifiedByName = row.name;
          signatoriesObj.verifiedByTitle = row.title;
        } else if (row.roleKey?.startsWith('member')) {
          signatoriesObj[`${row.roleKey}Name`] = row.name;
          if (row.title) signatoriesObj[`${row.roleKey}Title`] = row.title;
        }
      });
    }

    return NextResponse.json(
      {
        success: true,
        settings: settingsMap,
        signatories: signatoriesObj,
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Save Organization Settings and Signatories to Supabase
export async function POST(request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Database is not configured yet.' },
        { status: 500 }
      );
    }

    const supabase = getClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Failed to initialize database client.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { settings, signatories } = body;

    // 1. Save Settings ONLY into organization_settings table with matching column names
    if (settings && typeof settings === 'object') {
      const orgRowPayload = {
        id: 'default_org_settings',
        orgName: settings.orgName || '',
        orgCode: settings.orgCode || '',
        officeAddress: settings.officeAddress || '',
        contactEmail: settings.contactEmail || '',
        contactPhone: settings.contactPhone || '',
        defaultCurrency: settings.defaultCurrency || 'PHP',
        currencySymbol: settings.currencySymbol || '₱',
        reportHeaderTitle: settings.reportHeaderTitle || '',
        defaultUnit: settings.defaultUnit || 'unit',
        updatedAt: new Date().toISOString(),
      };

      const { error: orgUpsertErr } = await supabase
        .from('organization_settings')
        .upsert([orgRowPayload], { onConflict: 'id' });

      if (orgUpsertErr) {
        return NextResponse.json(
          {
            success: false,
            error: `Failed to save to organization_settings: ${orgUpsertErr.message}`,
          },
          { status: 400 }
        );
      }
    }

    // 2. Save Signatories ONLY into report_signatories table
    if (signatories && typeof signatories === 'object') {
      const sigRowsToUpsert = [
        {
          roleKey: 'preparedBy',
          label: 'Prepared by',
          name: signatories.preparedByName || '',
          title: signatories.preparedByTitle || '',
          order: 1,
        },
        {
          roleKey: 'certifiedCorrectBy',
          label: 'Certified Correct by',
          name: signatories.certifiedCorrectByName || '',
          title: signatories.certifiedCorrectByTitle || '',
          order: 2,
        },
        {
          roleKey: 'teamLeader',
          label: 'Team Leader',
          name: signatories.teamLeaderName || '',
          title: signatories.teamLeaderTitle || '',
          order: 3,
        },
        {
          roleKey: 'approvedBy',
          label: 'Approved by',
          name: signatories.approvedByName || '',
          title: signatories.approvedByTitle || '',
          order: 4,
        },
        {
          roleKey: 'verifiedBy',
          label: 'Verified by',
          name: signatories.verifiedByName || '',
          title: signatories.verifiedByTitle || '',
          order: 5,
        },
      ];

      ['member1', 'member2', 'member3', 'member4', 'member5'].forEach((mKey, idx) => {
        if (signatories[`${mKey}Name`]) {
          sigRowsToUpsert.push({
            roleKey: mKey,
            label: `Inventory Member ${idx + 1}`,
            name: signatories[`${mKey}Name`],
            title: signatories[`${mKey}Title`] || 'Member',
            order: 6 + idx,
          });
        }
      });

      const { error: sigUpsertErr } = await supabase
        .from('report_signatories')
        .upsert(sigRowsToUpsert, { onConflict: 'roleKey' });

      if (sigUpsertErr) {
        return NextResponse.json(
          {
            success: false,
            error: `Failed to save to report_signatories: ${sigUpsertErr.message}`,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { success: true, message: 'Settings saved to organization_settings and report_signatories successfully' },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
