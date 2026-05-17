# Privacy Manifest Draft — `PrivacyInfo.xcprivacy`

Apple requires `PrivacyInfo.xcprivacy` on every new submission since May 1, 2024. The actual file is a plist that lives at `ios/<TargetName>/PrivacyInfo.xcprivacy` in the native iOS project. We don't have an `ios/` scaffold yet (Expo's continuous-native flow hasn't been prebuild'd), so this document holds the decisions and the final XML, ready to drop into place after `npx expo prebuild`.

The Expo team auto-generates a baseline manifest during prebuild based on the `expo-modules` you have installed. That covers most of the third-party side. **This file documents what we add on top for app-specific declarations** — namely the data types we collect on behalf of our backend (Supabase), and a sanity audit of the Required Reason APIs that Apple watches for.

---

## Section 1 — Tracking

```
NSPrivacyTracking         : false
NSPrivacyTrackingDomains  : []
```

InSuite does not track users across apps or websites. Apple Sign-In is authentication for our own backend, not cross-property linkage. No advertising SDKs, no analytics SDKs that fingerprint users.

---

## Section 2 — Collected Data Types

Each entry maps to Apple's `NSPrivacyCollectedDataType*` enum. Every type we collect is:

- **Linked to identity**: yes — everything is keyed off `auth.uid` (the Supabase user id derived from Apple Sign-In).
- **Used for tracking**: no — same reason as Section 1.
- **Purposes**: `AppFunctionality` for everything. Chat messages additionally tagged `Communications`. No `Analytics`, `Personalization`, or `ThirdPartyAdvertising`.

| What we collect | Apple enum | Purpose | Notes |
|---|---|---|---|
| Email address | `NSPrivacyCollectedDataTypeEmailAddress` | `AppFunctionality`, `AccountAuthentication` | From Apple Sign-In. May be a private-relay address — we never see the real address when the user chooses "Hide my email." |
| Name | `NSPrivacyCollectedDataTypeName` | `AppFunctionality` | First name only; collected during onboarding and shown on profile / activity host / chat header. |
| Photos or Videos | `NSPrivacyCollectedDataTypePhotosorVideos` | `AppFunctionality` | Avatar image. Picked via `expo-image-picker` from the user's photo library, uploaded to Supabase Storage. Admin-clearable for moderation. |
| User Content | `NSPrivacyCollectedDataTypeOtherUserContent` | `AppFunctionality`, `Communications` | Bio text, activity notes, chat messages, vibe tags. The Communications purpose covers the chat side. |
| Coarse Location | `NSPrivacyCollectedDataTypeCoarseLocation` | `AppFunctionality` | We don't query GPS. The city used for Discover scoping is derived from the hotel the user selects, which they enter themselves — so it's coarse by construction. Conservative classification. |
| User ID | `NSPrivacyCollectedDataTypeUserID` | `AppFunctionality` | The Supabase user id; not exposed in the UI but persisted server-side. |
| Device ID | `NSPrivacyCollectedDataTypeDeviceID` | `AppFunctionality` | Expo Push token, stored in Supabase so we can deliver push notifications about the user's own conversations and join requests. Not used for tracking or advertising. |

Things we **don't** collect (worth being explicit, since reviewers sometimes assume the worst):

- **Precise Location** — no GPS, no IP-geolocation. The Coarse Location entry above is the only locational signal.
- **Contacts** — no address-book access.
- **Health & Fitness, Financial Info, Sensitive Info, Browsing History, Search History, Audio Data, Other Diagnostic Data** — none.
- **Crash data / Performance data** — none currently. If we add Sentry / Crashlytics later, this section needs `Crash Data` and `Performance Data` entries with `Analytics` purpose.

---

## Section 3 — Required Reason APIs

Apple requires a declared reason for each call into the "Required Reason API" categories. The reason codes are from <https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api>.

The Expo runtime and several of our installed modules use these APIs internally. Listing what's likely needed; the Expo prebuild output should be cross-checked against this list before submission.

| API category | Apple enum | Reason code | Used because |
|---|---|---|---|
| User Defaults | `NSPrivacyAccessedAPICategoryUserDefaults` | `CA92.1` | Access info from same app, same group. AsyncStorage and several Expo modules write here. |
| File Timestamp | `NSPrivacyAccessedAPICategoryFileTimestamp` | `C617.1` | Display to user / inside same app. Image caching in `expo-image`, `expo-image-manipulator`. |
| System Boot Time | `NSPrivacyAccessedAPICategorySystemBootTime` | `35F9.1` | Measure time the app has been active. Used by various RN performance bridges. |
| Disk Space | `NSPrivacyAccessedAPICategoryDiskSpace` | `E174.1` | Display to user. Used when validating uploads (avatar) so the user gets a friendly "not enough space" if appropriate. |

Categories we likely do **not** need (verify post-prebuild):

- `NSPrivacyAccessedAPICategoryActiveKeyboards` — only required if we query the user's keyboard list. We don't.

---

## Section 4 — Third-party SDK audit

Apple maintains a list of "commonly used SDKs" that must ship their own `PrivacyInfo.xcprivacy`. Each SDK we depend on with a native side is responsible for its own manifest; we just need to be on a version that includes one.

Native-side SDKs in current `package.json`:

| Package | Version | Manifest status |
|---|---|---|
| `expo` | `~54.0.34` | Bundled — SDK 50+ ships a manifest in `ExpoModulesCore`. |
| `expo-apple-authentication` | `~8.0.8` | Bundled by Expo. |
| `expo-constants` | `~18.0.13` | Bundled by Expo. |
| `expo-haptics` | `~15.0.8` | Bundled by Expo. |
| `expo-iap` | `~2.7.5` | **Verify** — community-maintained, double-check the version's `ios/PrivacyInfo.xcprivacy`. |
| `expo-image` | `~3.0.11` | Bundled by Expo (`SDWebImage` is wrapped). |
| `expo-image-manipulator` | `~14.0.8` | Bundled by Expo. |
| `expo-image-picker` | `~17.0.11` | Bundled by Expo. |
| `expo-notifications` | `~0.32.17` | Bundled by Expo. |
| `expo-router` | `~6.0.23` | JS-only — no manifest needed. |
| `expo-symbols` | `~1.0.8` | Bundled by Expo. |
| `expo-web-browser` | `~15.0.11` | Bundled by Expo. |
| `@react-native-async-storage/async-storage` | `2.2.0` | Bundled — ships its own manifest since v2. |
| `@supabase/supabase-js` | `^2.104.1` | Pure JS, no native side — no manifest needed. |

Action: re-run this audit when bumping any of these, and pin the `expo-iap` review to the version we actually ship with.

---

## Section 5 — Final XML (drop into `ios/InSuite2/PrivacyInfo.xcprivacy`)

This is the file content to commit once `npx expo prebuild` has scaffolded the `ios/` directory. It encodes Sections 1–3 above.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSPrivacyTracking</key>
  <false/>

  <key>NSPrivacyTrackingDomains</key>
  <array/>

  <key>NSPrivacyCollectedDataTypes</key>
  <array>
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeEmailAddress</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
        <string>NSPrivacyCollectedDataTypePurposeAccountAuthentication</string>
      </array>
    </dict>
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeName</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
      </array>
    </dict>
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypePhotosorVideos</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
      </array>
    </dict>
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeOtherUserContent</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
        <string>NSPrivacyCollectedDataTypePurposeCommunications</string>
      </array>
    </dict>
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeCoarseLocation</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
      </array>
    </dict>
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeUserID</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
      </array>
    </dict>
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeDeviceID</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
      </array>
    </dict>
  </array>

  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>CA92.1</string>
      </array>
    </dict>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>C617.1</string>
      </array>
    </dict>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategorySystemBootTime</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>35F9.1</string>
      </array>
    </dict>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryDiskSpace</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>E174.1</string>
      </array>
    </dict>
  </array>
</dict>
</plist>
```

---

## Path to landing this

1. Run `npx expo prebuild --platform ios` (one-time scaffold of the `ios/` directory).
2. Copy the XML from Section 5 into `ios/InSuite2/PrivacyInfo.xcprivacy`.
3. Open the workspace in Xcode → ensure the file is added to the **InSuite2** target's *Build Phases → Copy Bundle Resources*.
4. Build for archive. Xcode's **Privacy Report** tool (Product → Privacy Report) renders the manifest tree and flags anything inconsistent.
5. Cross-reference the rendered report against `docs/app-review-notes.md` — the user-facing description of what we collect must match the manifest's declarations exactly. Update one to match the other before submitting.

## Things to re-verify before each submission

- Bumped any `expo-*` / `expo-iap` / `async-storage` version since last submission? Re-check the SDK audit in Section 4 — a major bump can change what their bundled manifest declares.
- Added a new third-party SDK with a native side? Verify it ships its own manifest, and add it to Section 4.
- Started collecting a new data type (e.g. enabling Sentry would add crash data)? Add the entry to Section 2 + the XML in Section 5.
- Started calling a new Required Reason API category? Add the entry to Section 3 + the XML.
