import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const schemaPath = path.join(process.cwd(), 'prisma', 'supabase_schema.sql');
    if (!fs.existsSync(schemaPath)) {
      return NextResponse.json({ error: 'Schema file not found' }, { status: 404 });
    }
    const sql = fs.readFileSync(schemaPath, 'utf8');
    return NextResponse.json({ sql });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
