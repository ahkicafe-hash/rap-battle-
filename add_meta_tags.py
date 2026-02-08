#!/usr/bin/env python3
import re
import os

# File configurations: (filename, title, description)
files_config = [
    ("mybots.html", "ClawCypher.com | My Bots", "Manage your AI rap battle bots on ClawCypher. Edit, upgrade, and deploy."),
    ("notifications.html", "ClawCypher.com | Notifications", "View your notifications and alerts from ClawCypher."),
    ("profile.html", "ClawCypher.com | My Profile", "User profile on ClawCypher. View your stats, battles, and achievements."),
    ("referral.html", "ClawCypher.com | Referral Program", "Refer friends to ClawCypher and earn bonus credits."),
    ("rewards.html", "ClawCypher.com | Daily Rewards", "Claim rewards and bonuses on ClawCypher. Daily login and achievement rewards."),
    ("seasons.html", "ClawCypher.com | Season Rankings", "Current and past seasons on ClawCypher. Seasonal rankings and rewards."),
    ("store.html", "ClawCypher.com | Store", "Credits store for ClawCypher. Purchase credits to enter battles and unlock premium features."),
    ("terms.html", "ClawCypher.com | Terms & Privacy", "Terms of service and privacy policy for ClawCypher."),
    ("tournaments.html", "ClawCypher.com | Tournaments", "Tournaments and competitions on ClawCypher. Compete for grand prizes."),
    ("training.html", "ClawCypher.com | Bot Training", "Train your AI rap battle bot on ClawCypher. Improve performance and skills."),
    ("settings.html", "ClawCypher.com | Settings", "Account settings for ClawCypher. Manage preferences and security."),
    ("livebattle.html", "ClawCypher.com | Live Battle", "Watch ongoing live AI rap battles on ClawCypher in real-time."),
    ("betting.html", "ClawCypher.com | Betting Hub", "Place bets on AI rap battles at ClawCypher. Predict winners and earn credits."),
    ("messages.html", "ClawCypher.com | Messages", "Private messaging system for ClawCypher users."),
    ("feed.html", "ClawCypher.com | Feed", "Latest activity feed from ClawCypher. Battle results, new bots, and community updates."),
]

def add_og_twitter_tags(content, title, description):
    """Add OG and Twitter tags before </head> or <style>"""
    og_tags = f'''    <meta property="og:title" content="{title}">
    <meta property="og:description" content="{description}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="ClawCypher">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:site" content="@ClawCypher">
'''

    # Check if tags already exist
    if 'og:title' in content:
        return content

    # Try to find </script> followed by <style> pattern
    pattern = r'(    </script>\n)(    <style>)'
    if re.search(pattern, content):
        content = re.sub(pattern, r'\1' + og_tags + r'\2', content, count=1)
        return content

    # Fallback: add before </head>
    pattern = r'(</head>)'
    content = re.sub(pattern, og_tags + r'\1', content, count=1)
    return content

def add_aria_attributes(content):
    """Add ARIA attributes to nav, hamburger, mobile-menu, and mobile-overlay"""

    # Add to main nav (various patterns)
    patterns = [
        (r'(<nav[^>]*id="site-nav"[^>]*)(>)', r'\1 role="navigation" aria-label="Main navigation"\2'),
        (r'(<nav[^>]*class="site-nav"[^>]*)(>)', r'\1 role="navigation" aria-label="Main navigation"\2'),
    ]

    for pattern, replacement in patterns:
        if re.search(pattern, content) and 'role="navigation"' not in content:
            content = re.sub(pattern, replacement, content, count=1)
            break

    # Add to hamburger
    if 'aria-label="Toggle menu"' not in content:
        patterns = [
            (r'(<div class="hamburger"[^>]*onclick="toggleMobileMenu\(\)")(>)',
             r'\1 aria-label="Toggle menu" aria-expanded="false"\2'),
            (r'(<div[^>]*class="hamburger[^"]*"[^>]*onclick="toggleMobileMenu\(\)")(>)',
             r'\1 aria-label="Toggle menu" aria-expanded="false"\2'),
        ]
        for pattern, replacement in patterns:
            content = re.sub(pattern, replacement, content)

    # Add to mobile-overlay
    if 'mobile-overlay' in content and 'aria-hidden="true"' not in content:
        content = re.sub(
            r'(<div class="mobile-overlay"[^>]*)(>)',
            r'\1 aria-hidden="true"\2',
            content
        )

    # Add to mobile-menu
    if 'mobile-menu' in content and 'role="navigation"' not in re.search(r'mobile-menu[^>]*>', content).group() if re.search(r'mobile-menu[^>]*>', content) else False:
        content = re.sub(
            r'(<div[^>]*class="mobile-menu"[^>]*id="mobile-menu")(>)',
            r'\1 role="navigation" aria-label="Mobile navigation"\2',
            content
        )
        content = re.sub(
            r'(<div[^>]*id="mobile-menu"[^>]*class="mobile-menu")(>)',
            r'\1 role="navigation" aria-label="Mobile navigation"\2',
            content
        )

    return content

# Process each file
for filename, title, description in files_config:
    filepath = f"/Users/harrysmith/Desktop/claw-cypher-website/{filename}"

    if not os.path.exists(filepath):
        print(f"Skipping {filename} - file not found")
        continue

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Add OG/Twitter tags
        content = add_og_twitter_tags(content, title, description)

        # Add ARIA attributes
        content = add_aria_attributes(content)

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

        print(f"✓ Processed {filename}")
    except Exception as e:
        print(f"✗ Error processing {filename}: {e}")

print("\nAll files processed!")
