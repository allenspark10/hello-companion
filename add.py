import requests
import time
from telethon.sync import TelegramClient
from telethon.tl.functions.channels import EditAdminRequest
from telethon.tl.types import ChatAdminRights
# ===== CONFIGURATION =====
# Get these from https://my.telegram.org/apps
API_ID = '20697474'  # e.g., 12345678
API_HASH = '1acf41c146d578a57741ab0760208eb4'  # e.g., 'abcdef1234567890abcdef1234567890'
PHONE = '+447587490874'  # e.g., '+1234567890'

# Admin bot token and channel
ADMIN_BOT_TOKEN = "8448935976:AAFlpvX-T3xMBaAA_UZwJ_mslVuZgjmjH9w"
CHANNEL_ID = -1003232165605  # Use numeric ID without quotes

# Bot tokens
BOT_TOKENS = [

]

def get_bot_username(token):
    """Get bot username from token"""
    url = f"https://api.telegram.org/bot{token}/getMe"
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            result = response.json()
            return result['result']['username']
        return None
    except:
        return None

print("Promoting bots to admin using user session...\n")

# Initialize Telethon client
client = TelegramClient('session_name', API_ID, API_HASH)
client.start(phone=PHONE)

try:
    # Get channel entity
    channel = client.get_entity(CHANNEL_ID)
    print(f"Channel: {channel.title}")
    print(f"Type: {'Channel' if channel.broadcast else 'Group'}\n")
    
    # Define admin rights
    admin_rights = ChatAdminRights(
        change_info=True,
        post_messages=True,
        edit_messages=True,
        delete_messages=True,
        ban_users=True,
        invite_users=True,
        pin_messages=True,
        add_admins=True,
        manage_call=True,
        other=True  # Other admin rights
    )
    
    success = 0
    failed = 0
    
    for i, token in enumerate(BOT_TOKENS, 1):
        try:
            username = get_bot_username(token)
            if not username:
                print(f"[{i}/{len(BOT_TOKENS)}] ❌ Failed to get bot info")
                failed += 1
                continue
            
            print(f"[{i}/{len(BOT_TOKENS)}] Promoting @{username}...")
            
            # Get bot entity
            bot = client.get_entity(username)
            
            # Promote bot to admin directly
            client(EditAdminRequest(
                channel=channel,
                user_id=bot,
                admin_rights=admin_rights,
                rank='Bot Admin'  # Optional: custom title
            ))
            
            print(f"  ✅ Promoted to admin")
            success += 1
            
            # Delay to avoid flood limits
            time.sleep(3)
            
        except Exception as e:
            error_msg = str(e)
            if "USER_ALREADY_PARTICIPANT" in error_msg or "ADMIN_RANK_INVALID" in error_msg:
                print(f"  ℹ️  Already admin or needs adjustment")
                success += 1
            else:
                print(f"  ❌ Error: {error_msg}")
                failed += 1
    
    print(f"\n{'='*50}")
    print(f"✅ Successfully promoted: {success}")
    print(f"❌ Failed: {failed}")
    print(f"📊 Total bots: {len(BOT_TOKENS)}")
    print(f"{'='*50}")

finally:
    client.disconnect()

print("\nDone!")
