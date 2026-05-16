import os

def fix_encoding_issues():
    target_dir = r'c:\Users\Admin\OneDrive\Desktop\HotByte'
    exclude_dirs = {'node_modules', '.git'}
    
    # Mapping of broken characters or literals to HTML entities
    replacements = [
        ('₹', '&#8377;'),
        ('â‚¹', '&#8377;'),
        ('âˆ’', '&#8722;'), # Minus sign
        ('−', '&#8722;'), # Literal minus sign
    ]
    
    for root, dirs, files in os.walk(target_dir):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for file in files:
            if file.endswith(('.html', '.js')):
                file_path = os.path.join(root, file)
                try:
                    # Read with different encodings if utf-8 fails
                    content = None
                    for encoding in ['utf-8', 'latin-1', 'cp1252']:
                        try:
                            with open(file_path, 'r', encoding=encoding) as f:
                                content = f.read()
                            break
                        except:
                            continue
                    
                    if content is None:
                        continue
                        
                    new_content = content
                    for old, new in replacements:
                        new_content = new_content.replace(old, new)
                    
                    if content != new_content:
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        print(f"Fixed encoding: {file_path}")
                except Exception as e:
                    print(f"Error processing {file_path}: {e}")

if __name__ == "__main__":
    fix_encoding_issues()
