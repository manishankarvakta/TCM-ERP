import { defineConfig } from '@prisma/client/generator-helper'

export default defineConfig({
  seed: 'tsx prisma/seed.ts'
})

