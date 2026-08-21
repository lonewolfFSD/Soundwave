import os
path = "E:/Soundwave/android/app/src/main/java/com/lonewolffsd/soundwave/RingtonePlugin.java"
with open(path, 'rb') as f:
    data = f.read()
if data.startswith(b'\xef\xbb\xbf'):
    print("Found BOM, removing...")
    with open(path, 'wb') as f:
        f.write(data[3:])
else:
    print("No BOM found at start.")
