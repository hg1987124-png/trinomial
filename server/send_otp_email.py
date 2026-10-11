import os
import sys
import smtplib
import ssl
from email.message import EmailMessage


def send_otp_email(to_email: str, otp_code: str, user_name: str = "User", account_role: str = "Citizen") -> None:
    email = os.environ.get("SMTP_EMAIL", "programmmariojs8@gmail.com")
    password = os.environ.get("SMTP_PASSWORD", "eipsenitutruqzxo")

    role_label = "NGO & Civic Organization Portal" if account_role.lower() == "ngo" else "Citizen & Volunteer Portal"
    accent_color = "#F97316" if account_role.lower() == "ngo" else "#047857"
    bg_tint = "#fff7ed" if account_role.lower() == "ngo" else "#ecfdf5"

    msg = EmailMessage()
    msg["Subject"] = f"Your Kartavya Civic ({role_label}) Verification Passcode: {otp_code}"
    msg["From"] = f"Kartavya Civic <{email}>"
    msg["To"] = to_email

    plain_text = f"""Hello {user_name},

Your Kartavya Civic ({role_label}) verification code is: {otp_code}

This code will expire in 5 minutes.
If you did not request this code, please ignore this email.

— Team Kartavya Civic"""

    html = f"""<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;border:1px solid #e5e7eb;border-radius:8px;background:#ffffff;">
<div style="text-align:center;margin-bottom:24px;">
<div style="display:inline-block;padding:4px 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#ffffff;background:{accent_color};border-radius:4px;margin-bottom:8px;">{role_label}</div>
<h1 style="color:#047857;margin:0;font-size:26px;letter-spacing:0.5px;">Kartavya Civic</h1>
<p style="color:#6b7280;font-size:13px;margin:4px 0 0;">AI-Powered Civic Discovery &amp; Community Action Platform</p>
</div>
<p style="color:#111827;font-size:15px;line-height:1.6;">Hello <b>{user_name}</b>,</p>
<p style="color:#374151;font-size:14px;line-height:1.6;">Use the verification passcode below to authenticate your <b>{role_label}</b> account on Kartavya Civic:</p>
<div style="text-align:center;margin:30px 0;">
<span style="display:inline-block;letter-spacing:8px;font-size:32px;font-weight:800;color:{accent_color};background:{bg_tint};padding:14px 28px;border-radius:8px;border:1px dashed {accent_color};">{otp_code}</span>
</div>
<p style="color:#6b7280;font-size:13px;line-height:1.5;">This code will expire in <b>5 minutes</b>. For your security, never share this passcode with anyone.</p>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 16px;" />
<p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">&copy; Kartavya Civic &bull; OpenCity &amp; CPCB Grounded Action Platform</p>
</div>"""

    msg.set_content(plain_text)
    msg.add_alternative(html, subtype="html")

    context = ssl._create_unverified_context()
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context, timeout=15) as server:
        server.login(email, password)
        server.send_message(msg)
    print("SUCCESS")


if __name__ == "__main__":
    if len(sys.argv) >= 3:
        to_email_arg = sys.argv[1]
        otp_code_arg = sys.argv[2]
        user_name_arg = sys.argv[3] if len(sys.argv) > 3 else "User"
        role_arg = sys.argv[4] if len(sys.argv) > 4 else "user"
        send_otp_email(to_email_arg, otp_code_arg, user_name_arg, role_arg)
    else:
        print("Usage: python3 send_otp_email.py <to_email> <otp_code> [user_name] [role]", file=sys.stderr)
        sys.exit(1)
