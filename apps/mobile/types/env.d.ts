declare const process: {
  env: Record<string, string | undefined> & {
    IOS_BUILD_NUMBER?: string;
    EXPO_PUBLIC_API_URL?: string;
  };
};
