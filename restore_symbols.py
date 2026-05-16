import os

def fix_rupee_entities():
    target_dir = r'c:\Users\Admin\OneDrive\Desktop\HotByte'
    exclude_dirs = {'node_modules', '.git'}
    
    # We want to use the literal symbol instead of the HTML entity
    # because many places use textContent or template literals in JS.
    # UTF-8 handles this perfectly as long as the file is saved correctly.
    replacements = [
        ('&#8377;', '₹'),
        ('&#8722;', '−') # Also fix the minus sign
    ]
    
    for root, dirs, files in os.walk(target_dir):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for file in files:
            if file.endswith(('.html', '.js')):
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
                        print(f"Restored symbols: {file_path}")
                except Exception as e:
                    pass

if __name__ == "__main__":
    fix_rupee_entities()
