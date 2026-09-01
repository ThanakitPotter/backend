import 'dotenv/config';
import sqlite from '@prisma/orm-sqlite/runtime';
import type { Contract } from './contract.d.ts';
import contractJson from './contract.json' with { type: 'json' };

export const db = sqlite<Contract>({
  contractJson,
  path: process.env['DATABASE_URL']!.replace('file:', ''),
});
