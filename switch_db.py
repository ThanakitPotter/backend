import os

def replace_in_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

backend_dir = r"d:\InvoicesAndTaxes\backend"

# 1. Update prisma.config.ts
prisma_config_path = os.path.join(backend_dir, "prisma.config.ts")
replace_in_file(prisma_config_path, [
    ("@prisma/orm-sqlite/config", "@prisma/orm-postgres/config")
])

# 2. Update src/prisma/db.ts
db_ts_path = os.path.join(backend_dir, "src", "prisma", "db.ts")
db_ts_content = """import 'dotenv/config';
import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract.d.ts';
import contractJson from './contract.json' with { type: 'json' };

export const db = postgres<Contract>({
  contractJson,
  url: process.env['DATABASE_URL']!,
});
"""
with open(db_ts_path, 'w', encoding='utf-8') as f:
    f.write(db_ts_content)

# 3. Update .env
env_path = os.path.join(backend_dir, ".env")
with open(env_path, 'r', encoding='utf-8') as f:
    env_content = f.read()

# Replace DATABASE_URL
new_env_lines = []
for line in env_content.splitlines():
    if line.startswith("DATABASE_URL="):
        new_env_lines.append('DATABASE_URL="postgres://postgres.csptdvmhmpzglwomvqod:UimA7gJpMjzgJFd8@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"')
    else:
        new_env_lines.append(line)

with open(env_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_env_lines) + '\n')

print("Files updated successfully!")
