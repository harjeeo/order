// PlatformSettings is a singleton row. A fixed, well-known id (rather than
// "whichever row findFirst happens to return") means every reader and
// writer in the app agree on the same row, and upsert-by-id at the write
// site is race-free — see routes/platformSettings.ts's getOrCreate.
export const PLATFORM_SETTINGS_SINGLETON_ID = "platform-settings-singleton";
