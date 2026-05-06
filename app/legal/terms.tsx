import { Bullet, LegalLayout, P, Section, Strong } from '@/components/legal/Legal';

export default function TermsScreen() {
  return (
    <LegalLayout title="Terms of Service" effectiveDate="May 6, 2026">
      <P>By using InSuite, you agree to these terms.</P>

      <Section heading="1. Eligibility">
        <P>
          You must be at least 13 years old (or older if your country requires) to use InSuite.
          By using the app, you confirm you meet this requirement.
        </P>
      </Section>

      <Section heading="2. Your account">
        <Bullet>Provide truthful information — real first name, real photo of you, accurate hotel</Bullet>
        <Bullet>Don&apos;t impersonate someone else</Bullet>
        <Bullet>Don&apos;t share your account</Bullet>
        <Bullet>One person, one account</Bullet>
      </Section>

      <Section heading="3. Acceptable use">
        <P>You agree NOT to:</P>
        <Bullet>Harass, threaten, or harm other users</Bullet>
        <Bullet>Send unwanted sexual content</Bullet>
        <Bullet>Solicit money or services from other users</Bullet>
        <Bullet>Promote third-party products or businesses (no spam)</Bullet>
        <Bullet>Misrepresent who you are or where you&apos;re staying</Bullet>
        <Bullet>Use the app for any illegal activity</Bullet>
        <Bullet>Attempt to access other users&apos; accounts or data</Bullet>
        <Bullet>Reverse engineer or scrape the app</Bullet>
      </Section>

      <Section heading="4. Meeting in person">
        <P>
          InSuite helps you find company at hotel facilities.{' '}
          <Strong>Meeting other users is at your own risk.</Strong> We do not verify identities,
          vet hotel guests, or supervise meetings. Use common sense, meet in public hotel areas
          first, and trust your instincts.
        </P>
      </Section>

      <Section heading="5. Passes and purchases">
        <Bullet>Passes are sold through Apple&apos;s In-App Purchase. Apple is the seller.</Bullet>
        <Bullet>
          Passes are consumable — once purchased, they activate immediately and run for the
          stated duration.
        </Bullet>
        <Bullet>
          All sales are final unless required by Apple&apos;s refund policy. Refund requests
          must go through Apple — we cannot directly refund Apple-processed payments.
        </Bullet>
        <Bullet>
          We may change pricing for future purchases. Existing passes remain at the price you paid.
        </Bullet>
      </Section>

      <Section heading="6. Termination">
        <P>
          We may suspend or delete your account if you violate these terms or behave in a way
          that harms other users. We will give you reasonable notice when possible, except for
          violations involving safety, fraud, or law.
        </P>
        <P>You may delete your account at any time from Profile → Delete account.</P>
      </Section>

      <Section heading="7. Service availability">
        <P>
          InSuite is provided &quot;as is&quot;. We do not promise uninterrupted service,
          error-free operation, or any specific outcomes. We may modify or discontinue features.
        </P>
      </Section>

      <Section heading="8. Limitation of liability">
        <P>
          To the maximum extent allowed by law, InSuite is not liable for indirect, incidental,
          or consequential damages, including lost profits or data. Our total liability for any
          claim is limited to the amount you paid us in the past 12 months (or USD $50 if you
          haven&apos;t paid).
        </P>
      </Section>

      <Section heading="9. Privacy">
        <P>Use of InSuite is also governed by our Privacy Policy.</P>
      </Section>

      <Section heading="10. Changes">
        <P>
          We may update these terms. We will show a notice in the app for material changes.
          Continued use means acceptance.
        </P>
      </Section>

      <Section heading="11. Governing law">
        <P>
          These terms are governed by the laws of the Republic of China (Taiwan), without regard
          to conflict of laws. Disputes will be resolved in the courts of Taipei, Taiwan.
        </P>
      </Section>

      <Section heading="12. Contact">
        <P>
          Questions: <Strong>liphamju@gmail.com</Strong>
        </P>
      </Section>
    </LegalLayout>
  );
}
