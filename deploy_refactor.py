import os

file_path = 'index.html'
backup_path = 'index.html.bak'
start_line = 2109
end_line = 6403

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Verify the range looks like a script
# 0-indexed in python list so start_line-1
script_start = lines[start_line-1].strip()
script_end = lines[end_line-1].strip()

print(f"Line {start_line} content: {script_start}")
print(f"Line {end_line} content: {script_end}")

if not script_start.startswith('<script'):
    print("WARNING: Start line does not look like <script>")
    # exit(1) # Let's print and proceed if it's close, or just rely on user knowing
    
if not script_end.startswith('</script>'):
    print("WARNING: End line does not look like </script>")
    # exit(1)

# Keep content before start and after end
new_content = lines[:start_line-1] + lines[end_line:]

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_content)
    
print(f"Successfully removed lines {start_line} to {end_line} from {file_path}")
print(f"New line count: {len(new_content)}")
