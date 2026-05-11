#!/usr/bin/env python3
"""Automated Product Hunt signup - targeting the Sign In modal."""

import sys
import json
import time
import subprocess
sys.path.insert(0, '/home/aiagent/.openclaw/workspace/browser-service')

from browser_client import BrowserClient

EMAIL = "neil.ross@agentmail.to"
AGENTMAIL_API_KEY = "am_us_ae8798f1425ff62a7704d59e88a84b36044c0c3b5e7b61e6a1c1e1e2bc86828c"
BASE_URL = "http://127.0.0.1:8765"
ACCOUNTS_PATH = "/home/aiagent/.openclaw/workspace/projects/taxsense-local/marketing/accounts.json"

client = BrowserClient(base_url=BASE_URL)

def get_agentmail_messages():
    cmd = [
        "curl", "-s",
        "https://api.agentmail.to/v0/inboxes/neil.ross@agentmail.to/messages?limit=5",
        "-H", f"Authorization: Bearer {AGENTMAIL_API_KEY}"
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    try:
        return json.loads(result.stdout)
    except:
        return {"messages": []}

def main():
    print("=" * 60)
    print("PRODUCT HUNT SIGNUP - SIGN IN MODAL APPROACH")
    print("=" * 60)

    # Step 1: Go to homepage
    print("\n[1/8] Navigating to Product Hunt homepage...")
    client.navigate("https://www.producthunt.com")
    time.sleep(3)

    # Step 2: Click the header "Sign in" button (not newsletter)
    print("\n[2/8] Clicking header 'Sign in' button...")
    click_result = client.evaluate("""
        (function() {
            // Find the header sign in button specifically
            const buttons = document.querySelectorAll('button, a');
            for (const btn of buttons) {
                const txt = btn.textContent.trim().toLowerCase();
                if (txt === 'sign in') {
                    btn.click();
                    return 'Clicked Sign in button: ' + btn.outerHTML.substring(0, 200);
                }
            }
            return 'Sign in button not found';
        })();
    """)
    print(f"Sign in click: {click_result}")
    time.sleep(4)

    text = client.get_text()
    print(f"Page text after sign-in click: {text[:1200]}")

    # Step 3: Look for Sign Up tab/link in the modal
    print("\n[3/8] Looking for Sign Up tab in modal...")
    modal_info = client.evaluate("""
        (function() {
            // Check for modal/dialog
            const modal = document.querySelector('[role="dialog"], .modal, [class*="modal"], [class*="Modal"]');
            const tabs = document.querySelectorAll('[role="tab"], button, a');
            let signUpTab = null;
            for (const tab of tabs) {
                const txt = tab.textContent.trim().toLowerCase();
                if (txt === 'sign up' || txt === 'signup' || txt === 'join' || txt.includes('create')) {
                    signUpTab = tab;
                    break;
                }
            }
            
            // Also check for inputs in modal
            const inputs = document.querySelectorAll('input');
            const inputInfo = Array.from(inputs).map(i => ({
                type: i.type,
                name: i.name,
                id: i.id,
                placeholder: i.placeholder,
                outer: i.outerHTML.substring(0, 150)
            }));
            
            return JSON.stringify({
                modalFound: !!modal,
                signUpTabFound: !!signUpTab,
                signUpTabText: signUpTab ? signUpTab.textContent.trim() : null,
                inputCount: inputs.length,
                inputs: inputInfo.slice(0, 10)
            });
        })();
    """)
    print(f"Modal analysis: {modal_info}")

    # Step 4: Click Sign Up tab
    print("\n[4/8] Clicking Sign Up tab...")
    signup_click = client.evaluate("""
        (function() {
            const tabs = document.querySelectorAll('[role="tab"], button, a');
            for (const tab of tabs) {
                const txt = tab.textContent.trim().toLowerCase();
                if (txt === 'sign up' || txt === 'signup' || txt === 'join') {
                    tab.click();
                    return 'Clicked Sign Up tab: ' + tab.textContent.trim();
                }
            }
            return 'Sign Up tab not found';
        })();
    """)
    print(f"Sign up tab click: {signup_click}")
    time.sleep(3)

    # Step 5: Analyze signup form
    print("\n[5/8] Analyzing signup form...")
    form_info = client.evaluate("""
        (function() {
            const emailInp = document.querySelector('input[type="email"], input[name="email"], input[placeholder*="mail" i], #user_email, input[id*="email"]');
            const passInp = document.querySelector('input[type="password"], input[name="password"], input[id*="password"]');
            const nameInp = document.querySelector('input[name="name"], input[name="fullName"], input[placeholder*="name" i], input[id*="name"]');
            const submitBtn = Array.from(document.querySelectorAll('button, input[type="submit"]')).find(b => 
                b.textContent.toLowerCase().includes('sign up') ||
                b.textContent.toLowerCase().includes('create') ||
                b.textContent.toLowerCase().includes('join') ||
                b.textContent.toLowerCase().includes('continue')
            );
            const googleBtn = Array.from(document.querySelectorAll('button, a, div')).find(b => 
                b.textContent.toLowerCase().includes('google') || b.innerHTML.toLowerCase().includes('google')
            );
            
            return JSON.stringify({
                emailFound: !!emailInp,
                emailHTML: emailInp ? emailInp.outerHTML.substring(0, 200) : null,
                passFound: !!passInp,
                passHTML: passInp ? passInp.outerHTML.substring(0, 200) : null,
                nameFound: !!nameInp,
                nameHTML: nameInp ? nameInp.outerHTML.substring(0, 200) : null,
                submitFound: !!submitBtn,
                submitText: submitBtn ? submitBtn.textContent.trim() : null,
                googleFound: !!googleBtn,
                googleText: googleBtn ? googleBtn.textContent.trim() : null
            });
        })();
    """)
    print(f"Form info: {form_info}")

    # Step 6: Fill the form via JS for reliability
    print("\n[6/8] Filling signup form via JS...")
    fill_result = client.evaluate("""
        (function() {
            const emailInp = document.querySelector('input[type="email"], input[name="email"], input[placeholder*="mail" i], #user_email');
            const passInp = document.querySelector('input[type="password"], input[name="password"]');
            const nameInp = document.querySelector('input[name="name"], input[name="fullName"], input[placeholder*="name" i]');
            
            let filled = [];
            
            if (emailInp) {
                emailInp.focus();
                emailInp.value = "neil.ross@agentmail.to";
                emailInp.dispatchEvent(new Event('input', { bubbles: true }));
                emailInp.dispatchEvent(new Event('change', { bubbles: true }));
                filled.push('email');
            }
            
            if (passInp) {
                passInp.focus();
                passInp.value = "TaxSense2025!Secure";
                passInp.dispatchEvent(new Event('input', { bubbles: true }));
                passInp.dispatchEvent(new Event('change', { bubbles: true }));
                filled.push('password');
            }
            
            if (nameInp) {
                nameInp.focus();
                nameInp.value = "Neil Ross";
                nameInp.dispatchEvent(new Event('input', { bubbles: true }));
                nameInp.dispatchEvent(new Event('change', { bubbles: true }));
                filled.push('name');
            }
            
            return JSON.stringify({
                filled: filled,
                emailValue: emailInp ? emailInp.value : null,
                passValue: passInp ? (passInp.value.substring(0, 3) + '...') : null
            });
        })();
    """)
    print(f"Fill result: {fill_result}")
    time.sleep(2)

    # Step 7: Submit the form
    print("\n[7/8] Submitting signup form...")
    submit_result = client.evaluate("""
        (function() {
            // Try clicking submit button
            const btns = document.querySelectorAll('button, input[type="submit"]');
            for (const b of btns) {
                const txt = b.textContent.toLowerCase();
                const val = b.value ? b.value.toLowerCase() : '';
                if (txt.includes('sign up') || txt.includes('create') || txt.includes('join') || 
                    txt.includes('continue') || val.includes('sign up')) {
                    b.click();
                    return 'clicked button: ' + (b.textContent.trim() || b.value);
                }
            }
            
            // Try form submit
            const form = document.querySelector('form');
            if (form) {
                form.submit();
                return 'submitted form';
            }
            
            // Try Enter on password field
            const passInp = document.querySelector('input[type="password"]');
            if (passInp) {
                passInp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                return 'pressed Enter on password field';
            }
            
            return 'no submit method available';
        })();
    """)
    print(f"Submit result: {submit_result}")
    time.sleep(5)

    # Step 8: Final state
    print("\n[8/8] Checking final state...")
    text = client.get_text()
    print(f"Final page text: {text[:1500]}")

    # Check for specific states
    lower_text = text.lower()
    if "already" in lower_text and "account" in lower_text:
        status = "account_already_exists"
    elif "captcha" in lower_text or "recaptcha" in lower_text or "i'm not a robot" in lower_text:
        status = "captcha_blocked"
    elif "verify" in lower_text or "verification" in lower_text or "check your email" in lower_text:
        status = "verification_sent"
    elif "welcome" in lower_text or "success" in lower_text:
        status = "success"
    elif "error" in lower_text:
        status = "error"
    else:
        status = "unknown_state"

    print(f"Detected status: {status}")

    # Check AgentMail
    print("\n[9/9] Checking AgentMail for verification emails...")
    time.sleep(5)
    messages = get_agentmail_messages()
    
    verification_found = False
    ph_verification_link = None
    if isinstance(messages, dict):
        for msg in messages.get("messages", []):
            subject = msg.get("subject", "").lower()
            from_addr = msg.get("from", "").lower()
            body = msg.get("body", "") or msg.get("text", "")
            print(f"Email: from={from_addr}, subject={msg.get('subject')}")
            if "product hunt" in subject or "producthunt" in from_addr:
                verification_found = True
                import re
                links = re.findall(r'https?://[^\s<>"\']+', body)
                for link in links:
                    if "verify" in link.lower() or "confirm" in link.lower():
                        ph_verification_link = link
                        print(f"  -> Verification link: {link}")

    # Save result
    result = {
        "platform": "Product Hunt",
        "email": EMAIL,
        "status": status,
        "verification_email_received": verification_found,
        "verification_link": ph_verification_link,
        "page_text_summary": text[:1000],
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

    try:
        with open(ACCOUNTS_PATH, 'r') as f:
            accounts = json.load(f)
    except:
        accounts = {}

    accounts["product_hunt"] = result

    with open(ACCOUNTS_PATH, 'w') as f:
        json.dump(accounts, f, indent=2)

    print(f"\n{'='*60}")
    print("FINAL RESULT:")
    print(json.dumps(result, indent=2))
    print(f"{'='*60}")

    return result

if __name__ == "__main__":
    main()
