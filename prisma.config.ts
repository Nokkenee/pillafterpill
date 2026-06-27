import path from 'path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: path.join(__dirname, 'prisma/schema.prisma'),
  datasource: {
    url: 'postgresql://postgres:password@127.0.0.1:5432/bug_forum',
  },
});