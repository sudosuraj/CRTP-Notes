Before learning a single attack, you need a **mental model of Active Directory**.

# 1. First: What exactly is Active Directory?

Think of **Active Directory Domain Services, or AD DS**, as the organization's central system for managing:

* users
* computers
* groups
* passwords
* permissions
* policies
* authentication
* relationships between different domains

Imagine a company with 5,000 employees.

Instead of every Windows computer maintaining its own users and passwords, the company creates a central system:

```text
                    ACTIVE DIRECTORY
                           |
          +----------------+----------------+
          |                |                |
        Users           Computers         Groups
          |                |                |
       Alice           PC-101          Domain Admins
       Bob             PC-102          HR
       Charlie         SERVER-01       IT
```

That central AD environment is what you're going to attack and navigate in CRTP labs.

---

# 2. DOMAIN

This is one of the most important concepts.

A **domain** is a logical administrative boundary inside Active Directory.

Example from your lab:

```text
dollarcorp.moneycorp.local
```

That's a domain.

Inside it you might have:

```text
Users
Computers
Groups
Servers
Policies
Organizational Units
```

For example:

```text
dollarcorp.moneycorp.local
        |
        +-- Users
        |    +-- student505
        |    +-- admin
        |    +-- svcadmin
        |
        +-- Computers
        |    +-- DC01
        |    +-- CLIENT01
        |    +-- SERVER01
        |
        +-- Groups
             +-- Domain Admins
             +-- Users
             +-- RDPUsers
```

### Mental model

Think:

> **Domain = one organization's AD world**

Not necessarily the entire company, because a company can have multiple domains.

---

# 3. DOMAIN CONTROLLER, or DC

Now ask:

> Where does the domain actually live?

The answer is primarily on the **Domain Controller**.

A Domain Controller is a Windows Server running AD DS that provides services such as:

* authentication
* authorization-related directory information
* directory storage
* Kerberos authentication
* LDAP directory access
* replication with other DCs
* domain policy infrastructure

Example:

```text
dollarcorp.moneycorp.local

          |
       Domain
          |
     +----+----+
     |         |
   DC01       DC02
```

Both can be Domain Controllers for the same domain.

### Very important mental model

A DC is **not simply "the admin computer."**

It is a server that hosts the Active Directory domain services.

---

# 4. DOMAIN ADMIN

This is where beginners often misunderstand AD.

**Domain Admin is primarily a group, not simply a magical user type.**

There is a security group called:

```text
Domain Admins
```

Members of this group have very powerful privileges throughout the domain.

For example:

```text
Domain Admins
      |
      +-- Alice
      +-- Bob
      +-- svcadmin
```

The repo specifically tells you to enumerate members of the `Domain Admins` group.

So when a CRTP question says:

> "Escalate to Domain Admin"

the conceptual meaning is usually:

```text
Current low-privileged user
          ↓
obtain control of something useful
          ↓
obtain credentials / privileged access
          ↓
become or impersonate a member of
          ↓
Domain Admins
```

---

# 5. ENTERPRISE ADMINS

Now we go one level above.

There is also:

```text
Enterprise Admins
```

This is associated with the **forest root domain** and provides administrative privileges across the forest.

The repo explicitly points out that `Enterprise Admins` exists in the root of the forest, which is why it queries:

```text
moneycorp.local
```

rather than necessarily the child domain.

Mental model:

```text
FOREST
   |
   +-- Root Domain
   |      |
   |      +-- Enterprise Admins
   |
   +-- Child Domain
          |
          +-- Domain Admins
```

Remember:

> **Domain Admins = powerful within a domain**

> **Enterprise Admins = forest-wide administrative scope**

There are important technical nuances, but that's the beginner model you need first.

---

# 6. DOMAIN TREE

Suppose a company has:

```text
moneycorp.local
```

Then it creates:

```text
dollarcorp.moneycorp.local
eurocorp.moneycorp.local
```

These can be **child domains**.

So:

```text
moneycorp.local
      |
      +-- dollarcorp.moneycorp.local
      |
      +-- eurocorp.moneycorp.local
```

The parent/child relationship forms a **domain tree**.

---

# 7. CHILD DOMAIN

A **child domain** is a domain underneath another domain in the DNS/AD hierarchy.

Example:

```text
moneycorp.local
      |
      +-- dollarcorp.moneycorp.local
```

Here:

```text
moneycorp.local
```

is the parent/root domain.

And:

```text
dollarcorp.moneycorp.local
```

is a child domain.

CRTP loves this concept because you often need to understand:

```text
Which domain am I in?

What other domains exist?

What trusts exist between them?

Can privileges cross those boundaries?
```

The methodology explicitly asks you to enumerate domains in the `moneycorp.local` forest.

---

# 8. FOREST

This is probably the most important term after domain.

A **forest** is a collection of one or more AD domains that share a common AD structure and trust framework.

Example:

```text
                 FOREST
            moneycorp.local
                    |
        +-----------+-----------+
        |                       |
     dollarcorp             eurocorp
     .moneycorp.local       .moneycorp.local
```

Think:

```text
Domain = one house
Forest = the entire neighborhood
```

Not a perfect technical analogy, but excellent for remembering the hierarchy.

---

# 9. DOMAIN TREE vs FOREST

These sound similar, so separate them now.

### Tree

Domains connected in a parent/child hierarchy.

```text
moneycorp.local
      |
      +-- dollarcorp.moneycorp.local
      |
      +-- eurocorp.moneycorp.local
```

### Forest

The overall collection containing one or more domain trees.

```text
                 FOREST
                    |
          +---------+---------+
          |                   |
       Tree A               Tree B
          |                   |
      corp.local          partner.net
          |
       +-- child1
       +-- child2
```

So:

```text
FOREST
  └── TREE
       └── DOMAIN
            └── OUs / Users / Computers / Groups
```

---

# 10. TRUST

Now things get interesting.

Suppose:

```text
Domain A
   |
Domain B
```

A **trust** is a relationship between domains or forests that allows authentication or access relationships to cross the boundary, subject to how the trust is configured.

The repo asks you to enumerate:

```text
SourceName
TargetName
TrustAttributes
TrustDirection
```

when investigating trusts.

For now, think:

> **Trust = "these two AD environments have a defined relationship."**

---

# 11. TRUST DIRECTION

Suppose:

```text
A trusts B
```

That doesn't automatically tell you everything about who can authenticate where.

You need to understand the direction.

Simplified:

```text
A  --->  B
```

means there is a relationship in one direction.

Or:

```text
A  <-->  B
```

means bidirectional.

This becomes extremely important later because trust relationships can affect attack paths.

---

# 12. EXTERNAL TRUST

An **external trust** is a trust between domains that aren't simply connected through the normal parent/child structure of the same AD tree.

For example:

```text
moneycorp.local
       |
       | trust
       |
eurocorp.local
```

The repo specifically searches for trust relationships with `FILTER_SIDS` and calls these external trusts.

Don't worry about SID filtering yet. We will learn that separately.

---

# 13. USER

Simple one.

An AD user is an identity stored in the directory.

Examples:

```text
student505
administrator
svcadmin
ciadmin
```

You can think of a user as:

```text
identity + credentials + memberships + permissions
```

A user can be:

```text
member of groups
```

and groups determine a lot of what the user can do.

---

# 14. GROUP

A group is a collection of users or other groups.

Example:

```text
Domain Admins
    |
    +-- alice
    +-- bob
```

Or:

```text
RDPUsers
    |
    +-- student505
```

Groups are incredibly important in AD security because privileges are often granted through group membership.

---

# 15. SID

You will see this everywhere.

**SID = Security Identifier**

Windows doesn't fundamentally identify a security principal just by its friendly name.

For example:

```text
student505
```

has a SID such as:

```text
S-1-5-21-....-1105
```

Similarly:

```text
Domain Admins
```

has its own SID.

The methodology specifically tells you to record:

```text
MemberName
MemberSID
```

when enumerating Domain Admins.

Mental model:

```text
Name = human-friendly label
SID  = Windows security identity
```

---

# 16. OU

**OU = Organizational Unit**

This is an AD container used to organize objects.

Imagine:

```text
dollarcorp.local
       |
       +-- StudentMachines
       |
       +-- Servers
       |
       +-- Workstations
       |
       +-- HR
       |
       +-- IT
```

Inside:

```text
StudentMachines
       |
       +-- PC01
       +-- PC02
       +-- PC03
```

The repo specifically asks you to enumerate OUs and find computers inside `StudentMachines`.

### Crucial distinction

An OU is **not the same thing as a group**.

Group:

```text
controls membership / permissions
```

OU:

```text
organizes objects + provides a location for policies/delegation
```

---

# 17. GPO

**GPO = Group Policy Object**

This is how administrators centrally configure Windows machines and users.

For example, an organization can configure:

```text
Password policy
Firewall settings
PowerShell settings
Software deployment
Security settings
Registry settings
Login scripts
```

through Group Policy.

Think:

```text
GPO
 |
 +---- User settings
 |
 +---- Computer settings
```

The methodology asks you to enumerate all GPOs and identify which GPO is applied to `StudentMachines`.

---

# 18. ACL

**ACL = Access Control List**

An ACL answers:

> Who is allowed to do what to this object?

For example:

```text
Object: SomeGroup

Alice      -> Read
Bob        -> Modify
Administrators -> Full Control
```

The repo explicitly asks you to inspect ACLs for:

```text
Users
Domain Admins
```

and find interesting rights assigned to `student505`.

This is a HUGE CRTP concept.

Because an attack can sometimes be:

```text
I don't have admin privileges

BUT

I have an unexpected permission over something important
```

That permission may create an escalation path.

---

# 19. ACE

You'll hear **ACE** while learning ACLs.

```text
ACL
 |
 +-- ACE
 +-- ACE
 +-- ACE
```

An **ACE = Access Control Entry**.

Example:

```text
ACL for Object X

ACE 1:
Alice -> Read

ACE 2:
Bob -> Write

ACE 3:
Domain Admins -> Full Control
```

So:

```text
ACL = collection
ACE = one permission entry
```

---

# 20. LOCAL ADMINISTRATOR

This is **not the same as Domain Admin**.

Suppose:

```text
PC01
```

has:

```text
PC01\Administrator
```

That is a local administrator account.

It has administrative privileges on:

```text
PC01
```

but that does not automatically make it Domain Admin.

Very important:

```text
LOCAL ADMIN
    ↓
one machine

DOMAIN ADMIN
    ↓
domain-wide administrative privileges
```

---

# 21. DOMAIN USER

A domain user might look like:

```text
dcorp\student505
```

The first component:

```text
dcorp
```

identifies the domain.

The second:

```text
student505
```

is the username.

So:

```text
dcorp\student505
```

means:

```text
DOMAIN\USER
```

You'll constantly see this.

---

# 22. DOMAIN COMPUTER

A computer object is also stored inside AD.

Example:

```text
DC01
WEB01
FILE01
DCORP-ADMINsrv
```

AD therefore isn't just:

```text
users
```

It contains:

```text
users
computers
groups
OUs
GPO-related objects
service accounts
etc.
```

---

# 23. SHARE

A Windows network share is a remotely accessible filesystem location.

Example:

```text
\\SERVER01\Public
```

You can think:

```text
SERVER01
   |
   +-- Public
   +-- HR
   +-- Tools
```

The repository uses:

```text
Invoke-ShareFinder
```

to find accessible shares.

You'll eventually discover that shares are often extremely valuable during pentesting because they can contain:

```text
scripts
passwords
configuration files
documents
backups
deployment files
credentials
```

---

# 24. SMB

You'll encounter SMB constantly.

**SMB = Server Message Block**

It's a Windows network protocol heavily used for things like:

```text
file shares
remote administration
Windows network communication
```

For example:

```text
\\dcorp-server\share
```

is typically accessed through SMB.

---

# 25. WinRM

**WinRM = Windows Remote Management**

It allows remote management of Windows machines.

The repository uses:

```text
winrs
```

and:

```text
Enter-PSSession
```

to remotely access machines where the necessary permissions are present.

Mental model:

```text
Your machine
     |
     | WinRM
     ↓
Target Windows machine
```

---

# 26. PowerShell Remoting

This is remote PowerShell execution.

For example:

```powershell
Enter-PSSession -ComputerName SERVER01
```

Conceptually:

```text
You
 |
 | remote PowerShell
 ↓
SERVER01
```

This becomes important for **lateral movement**.

---

# 27. SERVICE ACCOUNT

A **service account** is an account used by a service/application rather than a human user.

Example:

```text
svcadmin
```

might run:

```text
SQL Server
Jenkins
IIS
Backup service
Custom application
```

The CRTP methodology specifically mentions discovering credentials for `svcadmin`, which is used as a service account.

Why pentesters care:

```text
service
   ↓
service account
   ↓
credentials
   ↓
potentially powerful permissions
```

---

# 28. LOCAL PRIVILEGE ESCALATION

This phrase will become one of your core concepts.

Suppose you start with:

```text
dcorp\student505
```

on:

```text
CLIENT01
```

and you're just a normal user.

Then you discover something that lets you become:

```text
CLIENT01\Administrator
```

That's **local privilege escalation**.

The repo's first privilege escalation objective is exactly this idea.

---

# 29. LATERAL MOVEMENT

This one is extremely important for CRTP.

Suppose you control:

```text
PC01
```

Then you use your access to reach:

```text
SERVER01
```

Then:

```text
SERVER01
   ↓
DC01
```

That's **lateral movement**.

Think:

```text
Machine A
   ↓
Machine B
   ↓
Machine C
```

You're moving **sideways through the environment**.

Not necessarily gaining privileges at every step.

---

# 30. PRIVILEGE ESCALATION vs LATERAL MOVEMENT

Memorize this distinction.

### Privilege escalation

```text
same machine
lower privilege
      ↓
higher privilege
```

Example:

```text
User
 ↓
Local Administrator
```

### Lateral movement

```text
same/similar privilege
      ↓
different machine
```

Example:

```text
CLIENT01
   ↓
SERVER01
```

You can combine them:

```text
User
 ↓
Local Admin on PC01
 ↓
Move to SERVER01
 ↓
Find privileged session
 ↓
Obtain Domain Admin access
```

That is much closer to a real AD attack path.

---

# 31. SESSION

A session is basically a logged-in execution context on a machine.

For example:

```text
SERVER01

Sessions:
    bob
    alice
    svcadmin
```

The CRTP methodology specifically asks you to identify machines where a **Domain Admin session** exists.

This is hugely important.

Because:

```text
"I found a Domain Admin account"
```

and:

```text
"I found a Domain Admin currently logged into SERVER01"
```

are very different pieces of information.

The second can potentially create a path to obtaining that user's credentials or authentication material, depending on the environment and protections.

---

# 32. BLOODHOUND

This is one of your most important CRTP tools.

BloodHound models AD as a **graph**.

Instead of seeing:

```text
User
Computer
Group
ACL
```

as disconnected things, it tries to answer:

> How are these objects connected?

Example:

```text
student505
    |
    | MemberOf
    ↓
RDPUsers
    |
    | AdminTo
    ↓
DCORP-ADMINSRV
```

That's a path.

The repository specifically uses BloodHound to find paths toward Domain Admins.

---

# 33. GRAPH

BloodHound uses nodes and edges.

### Nodes

Things like:

```text
User
Computer
Group
Domain
```

### Edges

Relationships:

```text
MemberOf
AdminTo
HasSession
CanRDP
CanPSRemote
GenericAll
GenericWrite
```

So:

```text
[student505]
      |
   MemberOf
      ↓
[RDPUsers]
      |
   AdminTo
      ↓
[DCORP-ADMINSRV]
```

This is the language of BloodHound.

---

# 34. DERIVATIVE LOCAL ADMIN

This phrase from the methodology can look scary at first.

The repo gives an example:

```text
student505
   ↓
MemberOf
RDPUsers
   ↓
AdminTo
DCORP-ADMINSRV
```

Therefore `student505` has local administrative access to that computer through group membership. The repository calls this **derivative local admin**.

The key idea:

> You may not directly see "student505 is an administrator."

Instead:

```text
student505
  ↓
group membership
  ↓
group has admin rights
  ↓
computer
```

Your admin rights are therefore **derived through another object**.

This is exactly why BloodHound is useful.

---

# 35. CREDENTIALS

Credentials are information used to authenticate.

Examples:

```text
username + password
password hash
Kerberos authentication material
NTLM-related material
AES key
tickets
```

For CRTP, don't think only:

```text
password
```

Think:

```text
authentication material
```

because Windows authentication has multiple mechanisms.

---

# 36. HASH

You'll hear hashes constantly in AD.

A password may be transformed into a cryptographic hash.

For NTLM-related authentication, you'll encounter values commonly referred to as:

```text
NTLM hash
```

You don't need the cryptographic details yet.

The important concept is:

```text
password
   ↓
authentication-related secret
```

Sometimes attackers can use authentication material without recovering the plaintext password.

That leads us into Pass-the-Hash later.

---

# 37. KERBEROS

This is a **major CRTP concept**.

Kerberos is a network authentication protocol used heavily in Windows Active Directory environments.

Very simplified:

```text
User
 |
 | authentication
 ↓
Domain Controller
 |
 | issues Kerberos ticket
 ↓
User
 |
 | uses ticket
 ↓
Service / Computer
```

Kerberos is central to many AD attack techniques.

---

# 38. TGT

**TGT = Ticket Granting Ticket**

This is a Kerberos ticket used to request additional service tickets.

Simplified:

```text
User
  ↓
TGT
  ↓
Service Ticket
  ↓
Access service
```

The repo later uses Rubeus and an AES key to request a TGT, which is part of the **Over-Pass-the-Hash** workflow.

Don't try to memorize the attack yet.

Just understand:

> **TGT = the important Kerberos ticket that lets a user request service tickets.**

---

# 39. PASS-THE-HASH

Instead of:

```text
I know the password
```

you may have:

```text
I have the NTLM hash
```

and in certain authentication scenarios, that hash can be abused to authenticate without knowing the plaintext password.

Mental model:

```text
Password
   ↓
NTLM hash

Normal:
Password → authentication

PtH:
Hash → authentication
```

We'll go extremely slowly when we reach this.

---

# 40. OVER-PASS-THE-HASH

This is different.

Instead of directly using an NTLM hash in NTLM authentication, an attacker can use key material such as an AES key to obtain a Kerberos TGT.

The methodology explicitly demonstrates Rubeus requesting a TGT using an AES256 key.

Mental model:

```text
Kerberos key material
        ↓
      TGT
        ↓
Kerberos authentication
```

We'll later compare:

```text
Pass-the-Hash
Pass-the-Ticket
Over-Pass-the-Hash
```

because these get confusing fast.

---

# 41. LSA / LSASS

You'll encounter these terms when studying credential theft.

### LSASS

**Local Security Authority Subsystem Service**

A Windows process involved in authentication and security operations.

You'll often see:

```text
lsass.exe
```

### LSA Secrets

Windows can store certain sensitive secrets associated with services, cached credentials, machine secrets, etc.

The methodology mentions extracting credentials and checking `LSA Secrets` in connection with a service account.

For now remember:

```text
LSASS / LSA
      ↓
Windows security/authentication secrets
```

---

# 42. REVERSE SHELL

The repo uses a reverse shell during its Jenkins section.

A reverse shell is conceptually:

```text
Target
   |
   | initiates connection OUT
   ↓
Your machine
   |
   ↓
interactive shell
```

Instead of you connecting directly to the target, the target connects back to you.

We'll use this only inside the lab environment.

---

# 43. INITIAL ACCESS

This term isn't a specific attack.

It simply means:

> How did you get your first foothold?

For example:

```text
valid credentials
web vulnerability
misconfigured service
Jenkins
phishing
stolen credentials
```

In this CRTP lab, one of the examples in the methodology involves obtaining access through Jenkins.

---

# 44. ENUMERATION

**Enumeration = asking the environment questions.**

This is probably the most important skill you'll develop.

For example:

```text
Who are the users?

What computers exist?

Who are Domain Admins?

What shares exist?

What OUs exist?

What GPOs exist?

What trusts exist?

What permissions exist?

Who is logged in where?
```

The methodology is heavily enumeration-driven.

Think:

```text
ENUMERATION
      ↓
UNDERSTAND ENVIRONMENT
      ↓
FIND RELATIONSHIPS
      ↓
FIND WEAKNESS
      ↓
EXPLOIT
```

That is the CRTP mindset.

---

# 45. PowerView

You'll see:

```powershell
Get-DomainUser
Get-DomainComputer
Get-DomainGroupMember
Get-DomainOU
Get-DomainGPO
Get-DomainTrust
```

These are **PowerView** functions.

PowerView is a PowerShell-based toolset for AD enumeration and related operations.

So:

```text
PowerView
    ↓
enumerate AD
    ↓
users
computers
groups
ACLs
trusts
etc.
```

The methodology explicitly loads `PowerView.ps1` near the beginning of its workflow.

---

# 46. One VERY important distinction

You will see these four concepts constantly:

```text
DOMAIN
DOMAIN CONTROLLER
DOMAIN ADMIN
DOMAIN ADMINS
```

Don't mix them.

| Term              | Meaning                                                             |
| ----------------- | ------------------------------------------------------------------- |
| Domain            | AD logical environment                                              |
| Domain Controller | Server providing AD DS services for the domain                      |
| Domain Admin      | Informal way to describe someone with Domain Admin level privileges |
| Domain Admins     | The built-in privileged AD group                                    |

---

# 47. Now visualize your CRTP lab

This is the picture I want burned into your brain:

```text
                         FOREST
                    moneycorp.local
                           |
             +-------------+-------------+
             |                           |
        dollarcorp                  eurocorp
     .moneycorp.local              .local
             |
       +-----+-----------------------+
       |                             |
     USERS                        COMPUTERS
       |                             |
       |                         +---+---+
       |                         |       |
 student505                    PCs     Servers
 svcadmin                       |         |
 ciadmin                        |        DC
       |                         |
       +---- GROUPS -------------+
              |
        +-----+------+
        |            |
    RDPUsers    Domain Admins
                       |
                    admins
```

Then add:

```text
OUs
 |
 +-- StudentMachines
 +-- Servers

GPOs
 |
 +-- policies applied to OUs

ACLs
 |
 +-- who can control what

TRUSTS
 |
 +-- relationships with other domains/forests

SESSIONS
 |
 +-- who is logged into which machine
```

Now the entire repo starts making sense.

---

# 48. The actual CRTP attack journey

The methodology is basically teaching you this chain:

```text
          LOW PRIVILEGE USER
                  |
                  ↓
             ENUMERATION
                  |
        +---------+---------+
        |         |         |
      Users    Groups    Computers
        |         |         |
        +---------+---------+
                  |
                  ↓
           Find weaknesses
                  |
        +---------+---------+
        |                   |
        ↓                   ↓
 LOCAL PRIV ESC        ACL / AD abuse
        |
        ↓
 LOCAL ADMIN
        |
        ↓
 BLOODHOUND
        |
        ↓
 Find relationships
        |
        ↓
 LATERAL MOVEMENT
        |
        ↓
 Privileged session /
 credentials /
 Kerberos material
        |
        ↓
 DOMAIN ADMIN
```

That is the **mental skeleton** of CRTP.

The repository's methodology explicitly follows this progression from enumeration, to local privilege escalation, to BloodHound, to lateral movement and privileged access.

---

# 49. Terms I want you to memorize TODAY

Don't memorize 100 things.

Get these **15 absolutely clear**:

```text
Domain
Domain Controller
Domain Admins
Enterprise Admins
Child Domain
Forest
Trust
User
Group
OU
GPO
ACL
SID
Local Admin
Lateral Movement
```

And understand this hierarchy:

```text
FOREST
  ↓
DOMAIN
  ↓
OU
  ↓
USER / COMPUTER / GROUP
```

With:

```text
GPO  → policy
ACL  → permissions
SID  → security identity
TRUST → relationship between domains/forests
DC   → server providing AD services
```

Then:

```text
Local Admin
     ≠
Domain Admin
```

and:

```text
Privilege Escalation
     ≠
Lateral Movement
```

---

## One last thing

**Do not start memorizing PowerView commands yet.**

That would be the classic beginner mistake.

First we need to make sure your brain can look at:

```text
student505
   ↓
RDPUsers
   ↓
DCORP-ADMINSRV
```

and immediately understand:

> "student505 is a user, RDPUsers is a group, DCORP-ADMINSRV is a computer, and the relationship between them may give student505 administrative rights on that machine."

Once that clicks, **BloodHound, ACL abuse, lateral movement, Kerberos, and Domain Admin paths become dramatically easier to understand.**
