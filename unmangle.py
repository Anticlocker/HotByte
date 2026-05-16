import os

def unmangle_website():
    target_dir = r'c:\Users\Admin\OneDrive\Desktop\HotByte'
    exclude_dirs = {'node_modules', '.git'}
    
    mapping = {
        'ðŸ ½ï¸': '🍽️',
        'âœ…': '✅',
        'ðŸŽ‰': '🎉',
        'â ±ï¸': '⌛',
        'ðŸ”¥': '🔥',
        'ðŸ“¦': '📦',
        'ðŸ””': '🔔',
        'ðŸª‘': '🪑',
        'ðŸ” ': '🔍',
        'ðŸ“‹': '📋',
        'ðŸŽ‚': '🎂',
        'ðŸŽ¨': '🎨',
        'âž•âž–': '➕➖',
        'ðŸ›’': '🛒',
        'ðŸ”„': '🔄',
        'ðŸš¦': '🚦',
        'ðŸ’³': '💳',
        'ðŸ’µ': '💵',
        'ðŸ™ ': '🙏',
        'âˆ’': '−',
        'â‚¹': '₹',
        'ðŸ˜Š': '😊',
        'ðŸ’¡': '💡',
        'ðŸš€': '🚀',
        'âœ–': '✖️',
        'ðŸ’°': '💰',
        'ðŸ“Š': '📊',
        'ðŸ“ ': '📍',
        'ðŸ“ž': '📞',
        'ðŸ“§': '📧',
        'ðŸ”‘': '🔑',
        'â†’': '→',
        'âž¡': '➡️',
        'âœ”': '✔',
        'ðŸ’¬': '💬'
    }
    
    for root, dirs, files in os.walk(target_dir):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for file in files:
            if file.endswith(('.html', '.js', '.css')):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'rb') as f:
                        raw_data = f.read()
                    
                    try:
                        content = raw_data.decode('utf-8')
                    except UnicodeDecodeError:
                        content = raw_data.decode('latin-1')
                    
                    new_content = content
                    for mangled, correct in mapping.items():
                        new_content = new_content.replace(mangled, correct)
                    
                    if content != new_content:
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        print(f"Unmangled: {file_path}")
                except Exception as e:
                    pass

if __name__ == "__main__":
    unmangle_website()
