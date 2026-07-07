declare const process: {
  env: Record<string, string | undefined> & {
    IOS_BUILD_NUMBER?: string;
    EXPO_PUBLIC_API_URL?: string;
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
    EXPO_PUBLIC_SENTRY_DSN?: string;
  };
};
