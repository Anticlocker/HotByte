import os

def fix_files():
    target_dir = r'c:\Users\Admin\OneDrive\Desktop\HotByte\DigiMenu'
    exclude_dirs = {'node_modules', '.git'}
    
    replacements = [
        ('hot<span style="color:#FF5A1F">Bytes</span>', 'Hot<span style="color:#FF5A1F">Byte</span>'),
        ('hotBytes', 'HotByte'),
        ('hotbytes', 'HotByte'),
        ('hotByte', 'HotByte'),
        ('hotbyte', 'HotByte'),
        ('â‚¹', '₹'),
        ('PuneByte', 'HotByte'), # Just in case
        ('punebyte', 'HotByte')
    ]
    
    for root, dirs, files in os.walk(target_dir):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for file in files:
            if file.endswith(('.html', '.js', '.css', '.json', '.md')):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    new_content = content
                    for old, new in replacements:
                        new_content = new_content.replace(old, new)
                    
                    if content != new_content:
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        print(f"Fixed: {file_path}")
                except Exception as e:
                    print(f"Error fixing {file_path}: {e}")

if __name__ == "__main__":
    fix_files()
