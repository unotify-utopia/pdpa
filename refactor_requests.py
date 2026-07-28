import re
import os

filepath = 'd:/PDPA req/src/App.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the start of the internal dashboard
start_idx = content.find("view === 'internal' && activeUser && (")
if start_idx == -1:
    print("Could not find start of internal dashboard")
    exit(1)

# Split the content
header_content = content[:start_idx]
internal_content = content[start_idx:]

# Replace `requests` with `filteredRequests` in the internal content
replacements = [
    (r'\brequests\.length\b', 'filteredRequests.length'),
    (r'\brequests\.filter\b', 'filteredRequests.filter'),
    (r'\brequests\.slice\b', 'filteredRequests.slice'),
    (r'requests=\{requests\}', 'requests={filteredRequests}'),
    (r'\{requests\}', '{filteredRequests}'),
    (r'\brequests\[', 'filteredRequests['),
    (r'requests\.map', 'filteredRequests.map'),
    (r'requests\.find', 'filteredRequests.find')
]

for old, new in replacements:
    internal_content = re.sub(old, new, internal_content)

# Fix activeUser.orgId inside internal_content
internal_content = internal_content.replace(
    "u.orgId === activeUser.orgId || activeUser.role === 'superadmin'",
    "u.orgId === currentViewOrgId || (activeUser.role === 'superadmin' && !impersonatedOrgId)"
)

# Fix handleManualSubmit in header
header_content = header_content.replace(
    "const orgId = activeUser.orgId || '';",
    "const orgId = currentViewOrgId || '';"
)

# Fix App Header org display in header
header_content = header_content.replace(
    "o.id === activeUser.orgId",
    "o.id === currentViewOrgId"
)

# Also fix the requests.find inside activeRequestObj calculation
# activeRequestObj = selectedRequestId ? requests.find(r => r.id === selectedRequestId) : null;
header_content = header_content.replace(
    "selectedRequestId ? requests.find(r => r.id === selectedRequestId) : null;",
    "selectedRequestId ? filteredRequests.find(r => r.id === selectedRequestId) : null;"
)

new_content = header_content + internal_content

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Refactored App.tsx successfully.")
