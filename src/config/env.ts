import { z } from 'zod';

const environmentSchema = z.object({
  supabaseUrl: z.string().url(),
  supabaseAnonKey: z.string().min(20),
});

export type EnvironmentConfig = z.infer<typeof environmentSchema>;

export type EnvironmentResult =
  | { configured: true; value: EnvironmentConfig }
  | { configured: false; message: string };

let cachedEnvironment: EnvironmentResult | undefined;

export function getEnvironment(): EnvironmentResult {
  if (cachedEnvironment) return cachedEnvironment;

  const parsed = environmentSchema.safeParse({
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  });

  cachedEnvironment = parsed.success
    ? { configured: true, value: parsed.data }
    : {
        configured: false,
        message:
          'ActionLens needs a Supabase project before authentication can start. Add the two EXPO_PUBLIC_SUPABASE values described in SETUP.md.',
      };

  return cachedEnvironment;
}
