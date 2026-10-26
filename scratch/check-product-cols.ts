import prisma from '../api/config/prisma.js';

async function checkColumns() {
  const cols: any = await prisma.$queryRaw`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'Product'
    ORDER BY ordinal_position;
  `;
  console.log('Product columns:', cols.map((c: any) => `${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`));
}
checkColumns();
