# CRTP Attack Methodology

---

## 1. General Enumeration Checklist

Run these **every time you land on a new foothold** or gain access to a new domain context.

### Domain Basics

* Enumerate all **Domain Users & Groups**
* Enumerate all **Computers** and **Shares**
* Enumerate **Domain Admins** and **Enterprise Admins**
* Enumerate all **Domains in the Forest**

### Organizational Structure

* Enum all **OUs** in the domain
* Find all **Computers/Users in each OU**
* Enum **GPOs** in each domain
* Find **GPO applied on a particular OU**

### Forest & Trusts

* Identify the **Forest**
* Identify **all Domains under the Forest**
* Identify **all Trusts** and trust directions — within the forest and outside the forest

### Session Hunting

* Find computers where a **Domain Admin (or specified user/group) has sessions**
  > Note: For Server 2019+, local administrator privileges are required to list sessions.

### ACL / Permissions Review

* List **interesting ACLs on particular objects** (User / Machine / GPO / Computer) of the compromised object

### AppLocker

* Check if **AppLocker is configured**

### Kerberoasting

* Find **SPN Service Accounts** and perform **Kerberoasting**

### Delegation

* Find servers where **Unconstrained Delegation** is enabled

---

## New Credential Checklist

> **Every time you get new user credentials, run through this list.**

* List **interesting ACLs by UserName**
* List **interesting ACLs by GroupName**
* List **interesting ACLs on particular objects** (User / Machine / GPO / Computer)
* Identify **domain machines where current user has Local Administrator access**
* Find computers where a **Domain Admin session is available AND current user has admin access**
* If current user **is local admin** → perform **Credential Dumping**:
  * LSASS dump (SafetyKatz / Mimikatz / Invoke-Mimikatz)
  * Keys & Credentials Vault

---

## 2. Techniques

### Privilege Escalation

| Technique | Description | Tools |
|-----------|-------------|-------|
| **Derivative Local Admin → Domain Admin** | Escalate to DA by chaining local admin access across machines where a DA has an active session | BloodHound, SafetyKatz, Mimikatz, Invoke-Mimikatz |
| **Credential Dumping from LSASS** | If a Domain Admin is logged onto a machine, their authentication material may exist in LSASS. With sufficient privileges, extract credentials or Kerberos keys | `SafetyKatz`, `Mimikatz`, `Invoke-Mimikatz` |
| **Privileged Session Abuse** | A privileged user's session on a machine becomes your PE path if you gain admin control over that machine | SafetyKatz, Mimikatz |

---

### GPO Abuse

| Technique | Description | Tools |
|-----------|-------------|-------|
| **GPO Abuse via WriteDACL + NTLM Relay** | Abuse delegated `WriteDACL` permissions over a GPO to gain control over the policy and execute commands on systems where the GPO applies | PowerView, ntlmrelayx, LDAP shell, GPOddity, Impacket, PowerShell, SMB, BloodHound |

---

### Coercion Techniques

| Technique | Description |
|-----------|-------------|
| **MS-WSP (Windows Search Protocol)** | Use the Windows Search Protocol for authentication coercion |
| **MS-DFSNM (DFS Namespace Protocol)** | Use the Distributed File System Namespace Protocol for coercion |
| **Printer Bug (MS-RPRN)** | Use the Print Spooler bug to force authentication from a target machine |

---

### Notes

- Privileged session on a machine → **administrative control over that machine** = privilege escalation path
- If DA is logged on to a machine and you have local admin → dump LSASS → get DA credentials / TGT
- Derivative local admin chains: Student → Local Admin on Server A → Server A has DA session → dump DA creds
