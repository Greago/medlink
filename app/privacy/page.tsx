import type { Metadata } from "next"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Privacy & data protection",
  description: "How Medlink Expedite handles personal data, including applicant data, under the Kenya Data Protection Act, 2019.",
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <div className="section-shell max-w-3xl py-14">
        <h1 className="text-3xl font-extrabold tracking-tight">Privacy &amp; data protection</h1>
        <p className="mt-3 text-sm text-muted-foreground">Medlink Expedite Ventures Limited · Nairobi, Kenya</p>
        <div className="rte-content mt-8">
          <h2>Our commitment</h2>
          <p>
            We process personal data in accordance with the Kenya Data Protection Act, 2019. This page explains how we
            collect, use and protect information from customers, website visitors and job applicants.
          </p>
          <h2>Cookies</h2>
          <p>
            We use strictly necessary cookies to keep the store secure and usable, and optional cookies only with your
            permission to remember your preferences and understand site usage. We do not use advertising cookies. You
            can review or change your choices at any time from the footer or our{" "}
            <a href="/cookies">cookie policy</a>.
          </p>
          <h2>Applicant data</h2>
          <ul>
            <li>We collect the information you submit with your application (name, contact details, experience, CV and screening answers) solely to manage recruitment.</li>
            <li>Access to applicant data is restricted to authorised recruitment staff, and access to CVs is logged.</li>
            <li>We retain applicant data only as long as needed for recruitment, or as configured in our retention policy. Rejected applications may be anonymised or deleted after the retention period.</li>
            <li>You may withdraw an application at any time from the application status page.</li>
          </ul>
          <h2>Your rights</h2>
          <p>
            You have the right to be informed of the use of your data, to access your data, to object to processing,
            and to request correction or deletion. To exercise these rights, email
            {" "}<a href="mailto:careers@medlinkexpedite.co.ke">careers@medlinkexpedite.co.ke</a> or reply to any recruitment email.
          </p>
          <h2>Security</h2>
          <p>
            Documents are stored securely and are never publicly accessible. We use role-based access controls,
            audit logging and sanitised content to protect your information.
          </p>
          <h2>Contact</h2>
          <p>
            Questions about this policy or your data can be sent to
            {" "}<a href="mailto:careers@medlinkexpedite.co.ke">careers@medlinkexpedite.co.ke</a>.
          </p>
        </div>
      </div>
      <Footer />
    </main>
  )
}