import os

def final_fix():
    target_dir = r'c:\Users\Admin\OneDrive\Desktop\HotByte'
    exclude_dirs = {'node_modules', '.git'}
    
    replacements = [
        ('servhunt.in', 'rav1.in'),
        ('punebyte.in', 'rav1.in'),
        ('PuneByte', 'HotByte'),
        ('punebyte', 'hotbyte')
    ]
    
    for root, dirs, files in os.walk(target_dir):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for file in files:
            if file.endswith(('.html', '.js', '.css', '.json', '.md', '.env')):
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
                        print(f"Updated: {file_path}")
                except Exception as e:
                    pass

if __name__ == "__main__":
    final_fix()
