interface StaffWelcomeInput {
  name: string
  email: string
  password: string
  origin: string
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }
    return entities[character]
  })
}

/** Best-effort welcome email. Never throws and never logs the temporary password. */
export async function sendStaffWelcomeEmail(input: StaffWelcomeInput): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { sent: false, error: "Email is not configured." }

  const from =
    process.env.ACCOUNT_FROM_EMAIL ||
    process.env.CATALOGUE_FROM_EMAIL ||
    "Medlink Expedites <catalogue@medlinkexpedite.co.ke>"
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || input.origin).replace(/\/$/, "")
  const loginUrl = `${baseUrl}/admin/login`

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.email],
        subject: "Your Medlink Expedites staff login",
        html: `
          <div style="font-family: Arial, sans-serif; color: #0f2b2e; max-width: 600px;">
            <h1 style="color: #0c1f1d;">Your staff login is ready</h1>
            <p>Hello ${escapeHtml(input.name)},</p>
            <p>An administrator has created a login for you at Medlink Expedites.</p>
            <div style="margin: 24px 0; padding: 16px; border-radius: 12px; background: #f3f6f5;">
              <p style="margin: 0 0 8px;"><strong>Login email:</strong> ${escapeHtml(input.email)}</p>
              <p style="margin: 0;"><strong>Temporary password:</strong> ${escapeHtml(input.password)}</p>
            </div>
            <p style="margin: 28px 0;">
              <a href="${escapeHtml(loginUrl)}"
                 style="display: inline-block; background: #0c1f1d; color: #ffffff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold;">
                Sign in
              </a>
            </p>
            <p><strong>You will be asked to change this password the first time you sign in.</strong></p>
            <p>If you did not expect this email, please contact your administrator.</p>
            <p style="color: #5f7a7d; margin-top: 32px;">
              Medlink Expedites<br />Medical Equipment Supply<br />info@medlinkexpedite.co.ke
            </p>
          </div>
        `,
      }),
    })

    if (!response.ok) {
      // Do not echo provider response bodies; they may contain sensitive request details.
      return { sent: false, error: "The email provider rejected the message." }
    }
    return { sent: true }
  } catch {
    return { sent: false, error: "The welcome email could not be delivered." }
  }
}
