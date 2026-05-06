import { Bullet, LegalLayout, P, Section, Strong, Sub } from '@/components/legal/Legal';

export default function PrivacyScreen() {
  return (
    <LegalLayout title="Privacy Policy" effectiveDate="May 6, 2026">
      <P>
        InSuite (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) respects your privacy.
        This Privacy Policy explains what data we collect, how we use it, and your choices.
      </P>

      <Section heading="1. Information we collect">
        <Sub>From Apple Sign-In</Sub>
        <P>
          When you sign in, Apple shares your verified email address and (with your consent) your
          first name. If you choose to hide your real email, Apple gives us a relay address — we
          never see your real email.
        </P>

        <Sub>Profile information you provide</Sub>
        <Bullet>First name</Bullet>
        <Bullet>Optional bio</Bullet>
        <Bullet>Languages you speak</Bullet>
        <Bullet>Hotel facilities you&apos;re open to (pool, gym, lounge, breakfast, spa, dinner)</Bullet>
        <Bullet>Optional vibe tags</Bullet>
        <Bullet>Optional profile photo</Bullet>

        <Sub>Activity information</Sub>
        <Bullet>Hotel you&apos;re staying at (chosen from our list)</Bullet>
        <Bullet>Activity details you create (venue, date, time, optional note)</Bullet>
        <Bullet>Join requests you send or receive</Bullet>

        <Sub>Messages</Sub>
        <P>
          Messages you send through accepted activities are stored on our servers so the
          conversation persists across sessions. We do not use end-to-end encryption.
        </P>

        <Sub>Push notification token</Sub>
        <P>
          A device-specific token from Apple that lets us deliver push notifications. Stored on
          our servers and refreshed periodically.
        </P>

        <Sub>Purchase information</Sub>
        <P>
          When you buy a Pass, we store the Apple transaction ID, product ID, and timestamp.
          We do not see or store your payment method — Apple handles payment.
        </P>

        <Sub>Technical data</Sub>
        <Bullet>Device type and OS version</Bullet>
        <Bullet>App version</Bullet>
        <Bullet>Crash logs (anonymized)</Bullet>
      </Section>

      <Section heading="2. How we use your data">
        <Bullet>To create your account and provide the service</Bullet>
        <Bullet>To match you with other guests at the same hotel or city</Bullet>
        <Bullet>To deliver messages between matched users</Bullet>
        <Bullet>To send push notifications you&apos;ve opted into</Bullet>
        <Bullet>To process your in-app purchase and grant the corresponding pass</Bullet>
        <Bullet>To detect abuse, harassment, or fraud</Bullet>
        <P>
          We do <Strong>not</Strong> use your data for advertising. We do <Strong>not</Strong>{' '}
          sell your data.
        </P>
      </Section>

      <Section heading="3. Service providers">
        <P>
          We rely on these providers to run InSuite. Each only sees the data they need.
        </P>
        <Bullet>
          <Strong>Apple</Strong> — Sign In, push notifications, in-app payments
        </Bullet>
        <Bullet>
          <Strong>Supabase</Strong> — database, file storage, realtime messaging
          (servers in the United States)
        </Bullet>
        <Bullet>
          <Strong>Expo</Strong> — over-the-air JS bundle delivery and dev tooling
        </Bullet>
      </Section>

      <Section heading="4. Data retention">
        <Bullet>Profile, activities, and messages: retained while your account is active</Bullet>
        <Bullet>Push tokens: deleted when you sign out or delete the account</Bullet>
        <Bullet>
          Purchase records: retained for tax and accounting purposes (typically 7 years per local law)
        </Bullet>
      </Section>

      <Section heading="5. Your choices">
        <Bullet>
          <Strong>Edit profile</Strong> — change your name, bio, languages, or photo any time
        </Bullet>
        <Bullet>
          <Strong>Delete account</Strong> — Profile → Delete account. Permanently removes all
          your data within 30 days, including activities, messages, and photos.
        </Bullet>
        <Bullet>
          <Strong>Push opt-out</Strong> — turn off in iOS Settings → InSuite → Notifications
        </Bullet>
      </Section>

      <Section heading="6. Children">
        <P>
          InSuite is not intended for users under 13. If we learn we have collected data from a
          child under 13, we delete it immediately.
        </P>
      </Section>

      <Section heading="7. International transfers">
        <P>
          Our servers are operated by Supabase in the United States. By using InSuite, you
          consent to your data being transferred to and processed in the U.S.
        </P>
      </Section>

      <Section heading="8. Changes to this policy">
        <P>
          We may update this policy. The &quot;Effective date&quot; above will change when we do.
          Continued use after changes means you accept the new policy.
        </P>
      </Section>

      <Section heading="9. Contact">
        <P>
          Questions about your data: <Strong>liphamju@gmail.com</Strong>
        </P>
      </Section>
    </LegalLayout>
  );
}
