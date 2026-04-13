// Run with: npx tsx scripts/seed-blog.ts
// Seeds the 10 initial blog posts

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const posts = [
  {
    slug: "how-to-spot-a-scam-invoice",
    title: "How to Spot a Scam on an Invoice",
    excerpt:
      "Invoice fraud cost UK businesses and individuals over £450 million in 2024. Learn the warning signs of a fake or intercepted invoice before you make a payment.",
    category: "Fraud Prevention",
    author: "WhoAmIPaying",
    published: true,
    published_at: new Date("2026-04-01").toISOString(),
    content: `Invoice fraud is one of the fastest-growing financial crimes in the UK. According to UK Finance, authorised push payment (APP) fraud — where victims are tricked into sending money to criminals — exceeded £450 million in 2024 alone. A significant proportion of this involves fake or intercepted invoices.

## How invoice scams work

Criminals use several tactics to exploit invoice payments:

**Email interception** — Fraudsters hack into email accounts of legitimate businesses and monitor conversations. When an invoice is due, they send a convincing email with altered bank details, directing payment to their own account.

**Fake invoices** — Scammers send invoices that look genuine, often mimicking real suppliers, using copied logos, similar email addresses, and realistic formatting. The bank details, however, belong to the fraudster.

**Mandate fraud** — A criminal contacts you pretending to be an existing supplier, claiming their bank details have changed. They provide "updated" account information and ask you to redirect future payments.

## Red flags to watch for

Here are the key warning signs that an invoice might be fraudulent:

- **Changed bank details** — If a supplier suddenly asks you to pay into a different account, always verify this by calling them on a known number (not one from the email).
- **Pressure to pay urgently** — Scammers create a false sense of urgency, claiming late fees or service disruption.
- **Slight differences in email addresses** — Look closely. A scammer might use "accounts@compny.co.uk" instead of "accounts@company.co.uk".
- **Poor formatting or spelling errors** — While not always present, grammatical mistakes can indicate a fake invoice.
- **Unfamiliar payment references** — If the reference number doesn't match your records, investigate further.
- **No VAT number, or an invalid one** — Legitimate UK businesses registered for VAT will display a valid VAT number. You can check this with HMRC.

## What the stats tell us

- **£450 million+** lost to APP fraud in the UK in 2024 (UK Finance Annual Fraud Report 2025)
- **Purchase scams** accounted for £87.1 million of APP fraud losses
- Only **59%** of APP fraud losses were reimbursed to victims in 2024
- **71%** of scam victims don't report the crime (CIFAS/GASA 2024)

## How to protect yourself

1. **Always verify bank details** — Before making any payment, especially a large one, call the supplier on a number you already have (not one from the invoice) to confirm the account details.
2. **Check the company** — Verify the company exists on Companies House and that their details match. Check their VAT number with HMRC.
3. **Use Confirmation of Payee** — This bank service checks whether the name on the account matches who you think you're paying.
4. **Don't rush** — Legitimate businesses won't pressure you into immediate payment. Take time to verify.
5. **Report anything suspicious** — Contact Action Fraud on 0300 123 2040.

## Run a check before you pay

Before sending any payment based on an invoice, run a quick verification check. WhoAmIPaying checks the bank account name against the payee, verifies the company on Companies House, validates their VAT number with HMRC, and searches online reviews — all in under 30 seconds.

**[Run a free check now →](/verify)**

It takes less than a minute and could save you thousands.`,
  },
  {
    slug: "how-to-spot-a-scam-on-facebook-marketplace",
    title: "How to Spot a Scam on Facebook Marketplace",
    excerpt:
      "With 34% of Facebook Marketplace listings potentially fraudulent, knowing how to spot a scam is essential. Here are the warning signs and how to protect yourself.",
    category: "Fraud Prevention",
    author: "WhoAmIPaying",
    published: true,
    published_at: new Date("2026-04-02").toISOString(),
    content: `Facebook Marketplace has become one of the UK's most popular platforms for buying and selling second-hand goods. But it's also become a hotspot for fraud. Research from TSB Bank found that **34% of Facebook Marketplace listings could be scams**, and **73% of all purchase fraud reports** they received were linked to the platform.

## The scale of the problem

- The average victim of a Facebook Marketplace scam loses **£647** (Santander, 2024)
- **37% of UK adults** have experienced a scam on an online marketplace (Experian, 2025)
- Between December 2023 and May 2024, Santander prevented **1,899 customers** from falling victim to Marketplace scams
- Purchase scams cost UK victims **£87.1 million** in 2024 (UK Finance)

## Common Facebook Marketplace scams

### 1. Non-delivery scams
The seller lists an attractive item at a good price, takes payment via bank transfer, and then disappears. The item never arrives and the seller blocks you.

### 2. Vehicle scams
Fake car, van, or motorbike listings with stolen photos. The scammer asks for a deposit or full payment before viewing, often claiming the vehicle is in storage or being shipped.

### 3. Fake electronics
Brand-new phones, laptops, or consoles listed well below retail price. Either counterfeit goods arrive, or nothing arrives at all.

### 4. Deposit scams
The seller asks for a deposit to "hold" an item, then stops responding once the money is sent.

### 5. Off-platform payment requests
The seller insists on payment via bank transfer, cryptocurrency, or gift cards rather than through Facebook's built-in payment protection.

## Red flags to watch for

- **Price too good to be true** — If a £1,000 item is listed for £300, be very suspicious.
- **New or empty profiles** — Scammers often use freshly created accounts with no friends, no history, and no profile photos.
- **Refuses to meet in person** — Legitimate sellers of high-value items are usually willing to meet locally.
- **Asks for bank transfer** — This is the biggest red flag. Once you send a bank transfer, it's very difficult to recover.
- **Stolen photos** — Right-click the listing photos and search Google Images. Scammers often steal photos from legitimate listings or dealer websites.
- **Won't video call or send additional photos** — If they can't prove they have the item, they probably don't.
- **Pressure to act fast** — "Someone else is interested" or "I need the money today" are classic pressure tactics.

## How to stay safe

1. **Meet in person** for high-value items. Bring someone with you and meet in a public place.
2. **Never pay by bank transfer** to someone you don't know. Use PayPal Goods & Services or Facebook's built-in checkout where available.
3. **Check the seller's profile** — Look for history, friends, and previous Marketplace activity.
4. **Get a valuation** — For vehicles or expensive items, check the market value before committing.
5. **Trust your instincts** — If something feels off, walk away. There will always be another listing.

## Verify before you pay

If a seller asks you to pay by bank transfer, you can check whether the bank account matches who they claim to be. WhoAmIPaying runs a Confirmation of Payee check, searches Companies House, and analyses online reviews in seconds.

**[Run a free check now →](/verify)**

Don't send money to a stranger without checking first.`,
  },
  {
    slug: "how-to-spot-a-scam-on-gumtree",
    title: "How to Spot a Scam on Gumtree",
    excerpt:
      "Nearly 1 in 3 Gumtree buyers have experienced a scam. Learn the most common Gumtree fraud tactics and how to protect your money.",
    category: "Fraud Prevention",
    author: "WhoAmIPaying",
    published: true,
    published_at: new Date("2026-04-03").toISOString(),
    content: `Gumtree has been a staple of UK online classifieds for years, but its open nature makes it a magnet for scammers. According to Which?, **29% of Gumtree buyers** surveyed had experienced a scam, while **16% of sellers** reported being targeted too.

## How much are people losing?

Online shopping and auction fraud accounted for **£104.6 million** in losses across the UK in the year to October 2024, with over **56,600 reported cases**. Gumtree, as one of the UK's largest classifieds platforms, accounts for a significant share.

- **22%** of victims lost between £51 and £100
- **13%** lost more than £250
- **4%** lost between £501 and £1,000
- Some victims reported losses exceeding **£1,000**

## Common Gumtree scams

### Advance payment fraud
The seller asks for payment (or a deposit) via bank transfer before you've seen the item. Once the money is sent, they vanish.

### Fake rental listings
Scammers list properties they don't own, often at below-market rents, and ask for a deposit and first month's rent upfront. The victim arrives to find the property doesn't exist or belongs to someone else.

### Overpayment scams (targeting sellers)
A "buyer" sends a cheque or payment for more than the asking price, then asks you to refund the difference. The original payment bounces, and you've lost the refunded amount.

### Vehicle scams
Fake car listings using stolen photos. The scammer claims the vehicle is in storage, being shipped, or available through a "secure" third-party escrow service that doesn't exist.

### Phishing links
A buyer or seller sends a link to a fake payment page that captures your bank details.

## Red flags on Gumtree

- **Seller won't meet in person** — especially for high-value items
- **Requests bank transfer before viewing** — legitimate sellers don't demand payment upfront
- **Listing copied from elsewhere** — reverse image search the photos
- **Too-good-to-be-true pricing** — significantly below market value
- **Poor English or generic responses** — scammers often use copy-paste messages
- **Asks you to communicate off-platform** — moving to WhatsApp or email makes fraud harder to trace
- **No phone number or won't take calls** — genuine sellers are usually happy to chat

## How to protect yourself

1. **Always view items in person** before paying — meet in a public, well-lit place.
2. **Never transfer money** to someone you haven't met. Use cash for in-person transactions or PayPal Goods & Services for posted items.
3. **Research the market price** — if a deal seems too good, it probably is.
4. **Check the account age** — new accounts with no history are higher risk.
5. **Report suspicious listings** — use Gumtree's reporting tools and contact Action Fraud.

## Check who you're paying

If anyone asks you to make a bank transfer for a Gumtree purchase, verify their identity first. WhoAmIPaying checks the bank account name, company registration, VAT status, and online reviews in seconds.

**[Run a free check now →](/verify)**

A 30-second check could save you hundreds.`,
  },
  {
    slug: "how-to-spot-a-scam-on-vinted",
    title: "How to Spot a Scam on Vinted",
    excerpt:
      "Vinted scams are on the rise in the UK, with 22% of buyers reporting fraud. Here's how to identify fake listings, phishing attempts, and payment scams.",
    category: "Fraud Prevention",
    author: "WhoAmIPaying",
    published: true,
    published_at: new Date("2026-04-04").toISOString(),
    content: `Vinted has quickly become one of the UK's favourite platforms for buying and selling second-hand clothing and accessories. But as its popularity has grown, so have the scams. Which? research found that **22% of Vinted buyers** and **11% of Vinted sellers** experienced a scam in a two-year period.

## The bigger picture

Across all online marketplaces, **37% of UK adults** have been targeted by scammers (Experian, 2025). The most common issues include:

- **Fake or counterfeit products** — 34% of marketplace scam victims
- **Requests to pay off-platform** — 31%
- **Items never arriving after payment** — 22%

## Common Vinted scams

### 1. Phishing messages
Scammers send messages through Vinted (or via email/SMS) containing links to fake payment pages. These pages look identical to Vinted's checkout but are designed to steal your card details.

### 2. Off-platform payment requests
A buyer or seller asks you to complete the transaction outside Vinted — via bank transfer, PayPal Friends & Family, or a link to a fake website. Once you leave Vinted's system, you lose buyer protection.

### 3. Item not as described
The seller sends a different item than what was listed, or the condition is far worse than advertised. While Vinted has buyer protection, the claims process can be slow.

### 4. Fake buyer scams (targeting sellers)
A "buyer" claims they've paid but sends a fake Vinted confirmation email. The seller posts the item before realising no real payment was made.

### 5. Return fraud
A buyer purchases an item, swaps it for a damaged or fake version, and returns the fake for a refund — keeping the genuine item.

## Red flags on Vinted

- **Messages asking you to pay outside Vinted** — this is always a scam
- **Links in messages** — never click links sent by other users; always use Vinted's built-in checkout
- **Brand-new accounts with no reviews** — higher risk of fraud
- **Prices that are suspiciously low** — designer items at car-boot prices should raise alarms
- **Pressure to complete quickly** — "Buy now before someone else does"
- **Requests for personal information** — Vinted never asks for your bank details via message

## How to stay safe on Vinted

1. **Always pay through Vinted's checkout** — this is the only way to get buyer protection.
2. **Never click links in messages** — go directly to the Vinted app or website.
3. **Check seller reviews and history** — established sellers with positive reviews are safer.
4. **Document everything** — screenshot listings and messages in case you need to dispute.
5. **Use the "I have an issue" button** — if something goes wrong, Vinted's buyer protection can help, but only if you paid through their system.

## When bank transfers are involved

Most Vinted transactions go through the app's payment system, which offers buyer protection. But if anyone ever asks you to pay by bank transfer — whether for a Vinted item or anything else — verify who you're paying first.

**[Run a free check now →](/verify)**

WhoAmIPaying checks the bank account, company details, and more in under 30 seconds.`,
  },
  {
    slug: "how-to-spot-a-scam-on-ebay",
    title: "How to Spot a Scam on eBay",
    excerpt:
      "With 29% of eBay buyers reporting scam experiences, knowing the warning signs is crucial. Learn how to shop safely and protect your money on eBay.",
    category: "Fraud Prevention",
    author: "WhoAmIPaying",
    published: true,
    published_at: new Date("2026-04-05").toISOString(),
    content: `eBay remains one of the UK's largest online marketplaces, with millions of transactions every day. But scammers are active on the platform too. According to Which?, **29% of eBay buyers** surveyed had experienced a scam in the previous two years.

## The numbers

- **£104.6 million** was lost to online shopping and auction fraud in the UK in the year to October 2024 — over **56,600 reported cases** (Action Fraud)
- **37% of UK adults** have experienced a marketplace scam (Experian, 2025)
- Only **59%** of APP fraud losses were reimbursed in 2024 (UK Finance)

## Common eBay scams

### 1. Non-delivery
The seller takes your money but never sends the item. They may provide a fake tracking number or claim the item was lost in transit.

### 2. Counterfeit goods
Fake designer clothing, electronics, or accessories listed as genuine. The photos may look legitimate, but the item that arrives is a cheap imitation.

### 3. Bait and switch
The listing shows a high-quality item, but the seller sends a cheaper or damaged version, hoping you won't bother with the returns process.

### 4. Shill bidding
The seller uses fake accounts to bid on their own items, driving up the price. This is against eBay's policies but can be hard to detect.

### 5. Off-platform payment requests
The seller contacts you asking to complete the deal outside eBay — often via bank transfer, wire transfer, or gift cards. This removes eBay's buyer protection.

### 6. Empty box scams
The seller sends a package (so tracking shows delivery), but the box is empty or contains something worthless.

## Red flags to watch for

- **New seller with no feedback** — higher risk, especially for expensive items
- **Price significantly below market value** — if everyone else is selling it for £500 and one listing is £150, be suspicious
- **Asks to complete the sale off eBay** — this is always a red flag
- **Stock photos instead of actual photos** — ask the seller for real photos of the actual item
- **Vague or copied descriptions** — legitimate sellers describe their items in detail
- **Seller located abroad but claims UK delivery** — common with counterfeit goods
- **Won't answer questions** — a genuine seller will happily provide more information

## How to protect yourself on eBay

1. **Always pay through eBay's checkout** — this ensures you're covered by eBay's Money Back Guarantee.
2. **Check seller feedback** — look at their rating and read recent reviews.
3. **Use PayPal or credit card** — these offer additional buyer protection.
4. **Read the listing carefully** — check for phrases like "box only" or "photo of item" that scammers use as loopholes.
5. **Keep all communication on eBay** — this creates an evidence trail if you need to dispute.
6. **Report suspicious listings** — help protect other buyers too.

## Verify before transferring money

If any eBay seller asks you to pay by bank transfer instead of through eBay's system, stop. Verify their identity first with a quick check.

**[Run a free check now →](/verify)**

WhoAmIPaying verifies bank account names, company registrations, VAT numbers, and online reviews — all in under 30 seconds.`,
  },
  {
    slug: "received-text-message-asking-for-payment",
    title: "I've Received a Text Message Asking for Payment — What Should I Do?",
    excerpt:
      "Smishing attacks are surging in the UK, with 50% of mobile users receiving suspicious texts. Here's exactly what to do if you get a scam text asking for money.",
    category: "Safety",
    author: "WhoAmIPaying",
    published: true,
    published_at: new Date("2026-04-06").toISOString(),
    content: `If you've received a text message asking you to make a payment, click a link, or "verify" your account — stop. Don't tap anything. You may be the target of a smishing attack.

Smishing (SMS phishing) is one of the fastest-growing scam methods in the UK. **50% of UK mobile users** received a suspicious text between November 2024 and February 2025, and reports of SMS scams rose by **40%** between 2024 and 2025.

## What is smishing?

Smishing is when criminals send text messages designed to trick you into:

- **Clicking a malicious link** that leads to a fake website designed to steal your login credentials or bank details
- **Making a payment** to a fraudulent account
- **Calling a fake number** where someone pretends to be your bank, HMRC, or another trusted organisation
- **Downloading malware** onto your phone

## Common smishing scam texts in the UK

- **"Royal Mail: Your parcel could not be delivered. Pay a £1.99 redelivery fee here..."**
- **"HMRC: You are owed a tax refund of £268.50. Claim here..."**
- **"Your bank: Unusual activity detected on your account. Verify here..."**
- **"Hi Mum/Dad, I've broken my phone. This is my new number. Can you send me £200 for..."**
- **"PayPal: Your account has been limited. Click here to restore access..."**

## The scale of the problem

- **£11.4 billion** was lost to scams in the UK in a 12-month period — equivalent to 0.4% of GDP (CIFAS/GASA, 2024)
- The average scam victim lost **£1,443**
- **100 million** suspicious messages were reported to mobile operators via 7726 in the year to April 2025
- **71%** of scam victims don't report the crime

## What to do if you receive a suspicious text

### Step 1: Don't click any links
No matter how urgent the message seems, do not tap on any links. Legitimate organisations will never ask you to enter sensitive details via a text message link.

### Step 2: Don't reply
Replying confirms your number is active, which can lead to more scam messages.

### Step 3: Report it
Forward the text to **7726** (spells "SPAM" on your keypad). This reports the number to your mobile operator, who can investigate and block it.

### Step 4: Report to Action Fraud
If you've lost money or shared personal details, report it to Action Fraud on **0300 123 2040** or at actionfraud.police.uk.

### Step 5: Contact your bank
If you've clicked a link and entered any banking details, call your bank immediately using the number on the back of your card.

### Step 6: Check your accounts
Monitor your bank accounts and credit file for any unusual activity in the days and weeks following the incident.

## How to tell if a text is genuine

- **Your bank will never ask you to move money** to a "safe account"
- **HMRC will never text you about refunds** — they use post
- **Delivery companies** will redirect you to their official website, not ask for payment via text
- **Check the sender** — scam texts often come from random mobile numbers, not named organisations

## If you're asked to make a payment

If any communication — text, email, or call — asks you to send money to a bank account, verify who you're paying before you transfer anything.

**[Run a free check now →](/verify)**

WhoAmIPaying checks whether the bank account matches the claimed payee, verifies company details, and flags potential risks — all in seconds.`,
  },
  {
    slug: "your-rights-when-purchasing-online",
    title: "What Are Your Rights If You Purchase Something Online?",
    excerpt:
      "From the Consumer Rights Act to Section 75 protection, here's a complete guide to your legal rights when buying online in the UK.",
    category: "Guides",
    author: "WhoAmIPaying",
    published: true,
    published_at: new Date("2026-04-07").toISOString(),
    content: `Buying online is convenient, but when things go wrong — faulty goods, items that never arrive, or outright scams — it's important to know your legal rights. UK consumers have some of the strongest protections in the world.

## The Consumer Rights Act 2015

This is your primary protection when buying goods or services online. Under the Act, anything you buy must be:

- **Of satisfactory quality** — not faulty or damaged
- **Fit for purpose** — it must do what it's supposed to do
- **As described** — it must match the description, photos, and any sample shown

### Your right to a refund

- **Within 30 days**: You have the right to reject faulty goods and receive a full refund.
- **After 30 days but within 6 months**: The retailer gets one chance to repair or replace. If that fails, you can request a refund.
- **After 6 months**: You must prove the fault was present at the time of purchase (harder, but still possible).

## The 14-day cooling-off period

For online purchases, you have a separate **14-day right to cancel** under the Consumer Contracts Regulations 2013. This applies even if the item isn't faulty — you simply changed your mind.

Key points:
- The 14-day period starts the day after you receive the goods
- You must notify the seller within 14 days that you want to cancel
- You then have a further 14 days to return the goods
- The seller must refund you within 14 days of receiving the returned goods (including standard delivery costs)

**Exceptions**: Personalised items, perishable goods, sealed hygiene products that have been opened, and digital downloads that you've started accessing.

## Section 75 — Credit card protection

If you paid using a **credit card** for goods or services costing between **£100 and £30,000**, you have additional protection under Section 75 of the Consumer Credit Act 1974.

This means your credit card provider is **jointly liable** with the seller if:
- Goods are faulty or not as described
- The seller goes bust
- Goods or services are never delivered

This applies even if you only paid part of the cost on your credit card (for example, a deposit).

## Chargeback — Debit card protection

If you paid by **debit card**, you may be able to claim through your bank's **chargeback scheme**. This allows you to reclaim money if:

- Goods don't arrive
- Goods are faulty
- The seller has gone bust

Chargeback claims must typically be made within **120 days** of the transaction, though this can vary by card network. It's not a legal right like Section 75, but banks usually honour it.

## PayPal Buyer Protection

If you paid via PayPal, their Buyer Protection covers:
- Items not received
- Items significantly not as described

You have **180 days** from the payment date to open a dispute.

## What if you've been scammed?

If you sent money to a scammer via bank transfer, your protections are more limited. However:

- Under the **CRM Code** (Contingent Reimbursement Model), many UK banks will reimburse APP fraud victims unless the victim was grossly negligent
- Since **October 2024**, new PSR rules mean banks must reimburse APP fraud victims up to £85,000 within 5 business days
- **86%** of in-scope APP fraud was reimbursed in the first three months of the new rules (UK Finance)

## Protect yourself before you pay

The best protection is prevention. Before making any payment — especially by bank transfer — verify who you're paying.

**[Run a free check now →](/verify)**

WhoAmIPaying checks the bank account, company registration, VAT status, and online reputation in under 30 seconds. It's free for your first check.`,
  },
  {
    slug: "how-to-make-sure-my-payment-is-safe",
    title: "How to Make Sure My Payment Is Safe",
    excerpt:
      "Over £1.1 billion was stolen by fraudsters in the UK in 2024. Here's a practical guide to making every payment safely.",
    category: "Guides",
    author: "WhoAmIPaying",
    published: true,
    published_at: new Date("2026-04-08").toISOString(),
    content: `Every time you make a payment — whether it's for a builder, a car, an online purchase, or a business invoice — there's a risk that the money could end up in the wrong hands. In 2024, **over £1.1 billion** was stolen by fraudsters in the UK (UK Finance Annual Fraud Report 2025).

The good news? Most fraud is preventable with a few simple checks.

## The golden rules of safe payments

### 1. Verify who you're paying

This is the single most important step. Before you send any money, confirm that:
- The **bank account name** matches the person or business you think you're paying
- The **company is real** and registered with Companies House
- Their **VAT number is valid** (if they've quoted one)
- They have a **genuine online presence** with real reviews

### 2. Use the right payment method

Your choice of payment method determines how much protection you have:

| Method | Protection level |
|---|---|
| **Credit card** | Best — Section 75 covers purchases £100-£30,000 |
| **Debit card** | Good — chargeback available within 120 days |
| **PayPal Goods & Services** | Good — 180-day buyer protection |
| **Bank transfer** | Minimal — very hard to recover once sent |
| **Cash** | None — no trail, no recovery |
| **Cryptocurrency** | None — irreversible and untraceable |
| **Gift cards** | None — a hallmark of scams |

**Rule of thumb**: If someone insists on bank transfer, cryptocurrency, or gift cards, treat it as a red flag.

### 3. Check Confirmation of Payee

Most UK banks now offer **Confirmation of Payee (CoP)** — a service that checks whether the name you've entered matches the name on the receiving bank account. If you get a "no match" or "partial match" warning, stop and investigate.

### 4. Don't rush

Scammers rely on urgency. Common tactics include:
- "The price will go up tomorrow"
- "Someone else is about to buy it"
- "We need payment today or we can't start the work"

Legitimate businesses and sellers will give you time to verify their details.

### 5. Be extra cautious with large payments

The bigger the payment, the more checks you should do:

- **Under £100**: Standard care — check the seller's profile and reviews
- **£100 – £1,000**: Verify the bank account name and company details
- **£1,000+**: Full verification — bank account, Companies House, VAT, reviews, and ideally meet in person for physical goods

### 6. Verify changes to payment details

If a supplier, tradesperson, or anyone you're paying contacts you to say their bank details have changed, **always verify this independently**. Call them on a number you already have — not one from the email or message claiming the change.

This type of fraud (mandate fraud) accounted for a significant portion of the **£450 million+** lost to APP fraud in 2024.

## When to be most vigilant

Certain situations carry higher fraud risk:

- **Paying a new supplier or tradesperson** for the first time
- **Buying a vehicle** from a private seller
- **Paying a deposit** for property, building work, or an event
- **Responding to an invoice** received by email
- **Buying from online marketplaces** like Facebook Marketplace, Gumtree, or eBay
- **Paying someone you've only communicated with online**

## What to do if something goes wrong

If you think you've been scammed:

1. **Contact your bank immediately** — they may be able to stop or reverse the payment
2. **Report to Action Fraud** — 0300 123 2040 or actionfraud.police.uk
3. **Report to the platform** — if the scam happened on a marketplace
4. **Keep all evidence** — screenshots, messages, emails, bank statements

## Check before every payment

The easiest way to make sure your payment is safe is to verify the recipient before you send the money.

**[Run a free check now →](/verify)**

WhoAmIPaying runs Confirmation of Payee, Companies House verification, VAT validation, and online review checks — all in under 30 seconds. Your first check is free.`,
  },
  {
    slug: "how-to-report-a-scam",
    title: "How Can I Report a Scam? What Should I Do?",
    excerpt:
      "71% of UK scam victims don't report the crime. Here's exactly who to contact, what to do in the first hour, and how reporting helps catch criminals.",
    category: "Safety",
    author: "WhoAmIPaying",
    published: true,
    published_at: new Date("2026-04-09").toISOString(),
    content: `If you've been scammed — or think you might have been — acting quickly is essential. The first few hours can make the difference between recovering your money and losing it for good.

Yet **71% of UK scam victims don't report** the crime (CIFAS/GASA, 2024). Many feel embarrassed, or believe nothing will happen. But reporting matters — it helps banks trace funds, enables law enforcement to build cases, and protects others from the same criminals.

## What to do immediately

### In the first hour

**1. Contact your bank**
Call your bank immediately using the number on the back of your card. Tell them you believe you've been a victim of fraud. They can:
- Attempt to freeze or recover the payment
- Flag the receiving account
- Begin a fraud investigation

Since **October 2024**, new PSR rules require banks to reimburse APP fraud victims up to **£85,000** within 5 business days for eligible claims.

**2. Stop all communication with the scammer**
Don't reply to any further messages. Don't click any more links. Screenshot everything before blocking them.

**3. Secure your accounts**
If you've shared any login details, passwords, or personal information:
- Change your passwords immediately
- Enable two-factor authentication
- Check your email for any suspicious login alerts

### Within 24 hours

**4. Report to Action Fraud**
Action Fraud is the UK's national reporting centre for fraud and cybercrime.

- **Phone**: 0300 123 2040
- **Website**: actionfraud.police.uk
- **Online reporting**: Available 24/7

You'll receive a crime reference number, which you'll need for any bank claims or insurance claims.

**5. Report to the platform**
If the scam happened on a specific platform:
- **Facebook Marketplace**: Report the listing and the user's profile
- **eBay**: Use the Resolution Centre
- **Gumtree/Vinted**: Use the in-app reporting tools
- **WhatsApp**: Report and block the number

**6. Forward scam texts to 7726**
If you received a scam text message, forward it to **7726** (free). This reports the number to your mobile operator.

**7. Forward scam emails to the NCSC**
Send suspicious emails to **report@phishing.gov.uk**. The National Cyber Security Centre investigates and takes down malicious websites.

## Who else to contact

| Situation | Contact |
|---|---|
| Lost money via bank transfer | Your bank + Action Fraud |
| Credit card fraud | Your card provider (Section 75 claim) |
| Identity theft | CIFAS (cifas.org.uk) for protective registration |
| Investment scam | FCA (fca.org.uk/scamsmart) |
| Pension scam | The Pensions Regulator |
| Online marketplace scam | The platform + Action Fraud |
| Ongoing harassment or threats | Police (101, or 999 if immediate danger) |

## What happens when you report?

When you report to Action Fraud:
1. Your report is assessed by the **National Fraud Intelligence Bureau (NFIB)**
2. Cases are analysed for links to known criminal networks
3. If there's enough evidence, cases are passed to a **local police force** for investigation
4. Your report contributes to **intelligence** even if your individual case isn't investigated

In the year to April 2025, reports via the 7726 service led to **27,000 scams being removed**.

## Why reporting matters

- It helps your bank process your claim for reimbursement
- It builds evidence against repeat offenders
- It enables platforms to remove scam listings faster
- It protects other potential victims
- It feeds into national intelligence on fraud trends

## Prevent it happening again

The best protection against scams is verification. Before your next payment, check who you're really paying.

**[Run a free check now →](/verify)**

WhoAmIPaying verifies bank accounts, company details, VAT numbers, and online reviews in under 30 seconds. Prevention is always better than recovery.`,
  },
  {
    slug: "buying-a-tractor-on-facebook-marketplace",
    title: "I Want to Buy a Tractor — Should I Buy It on Facebook Marketplace?",
    excerpt:
      "Farm machinery scams are surging in the UK, with fraud claims jumping from 2% to 10% in just three years. Here's how to buy a tractor safely.",
    category: "Guides",
    author: "WhoAmIPaying",
    published: true,
    published_at: new Date("2026-04-10").toISOString(),
    content: `Buying a tractor — or any farm machinery — is a significant investment. A used tractor can easily cost £10,000 to £50,000 or more, making it a prime target for scammers. And increasingly, these scams are happening on Facebook Marketplace.

## The growing problem of farm machinery fraud

Hampshire and Isle of Wight Constabulary issued a warning in January 2025 about a **farm machinery scam affecting victims across the UK**. In one case, buyers travelled from Devon and Scotland to an Isle of Wight farm to collect equipment they'd paid for — only to find the seller didn't exist.

The numbers are alarming:

- Farm machinery **fraud claims have jumped from 1-2% to 9-10%** of all claims in just three years (NFU Mutual)
- Losses can run into **tens of thousands of pounds** per transaction
- Some farms only make **£10,000-£20,000 profit per year** — a single scam can wipe out years of income
- Scammers steal photos from **legitimate dealers and agricultural magazines** to create convincing fake listings

## How tractor scams work on Facebook Marketplace

### The typical pattern:

1. **Fake listing appears** — A tractor or piece of farm equipment is listed at an attractive (but not unbelievably low) price. Photos are stolen from genuine dealer websites or agricultural publications.

2. **The seller sounds legitimate** — They may claim to be a retired farmer, a dealer clearing stock, or someone upgrading their equipment.

3. **Excuses for not viewing** — The equipment is "in a warehouse," "in storage," or "at another farm." They promise to have it delivered or couriered once payment is made.

4. **Payment by bank transfer** — The seller insists on bank transfer, often requesting a deposit first, then the balance before delivery.

5. **The equipment never arrives** — Once payment is made, the seller stops responding or provides fake courier tracking. The buyer is left with no equipment and no money.

### Variations:

- **Meet-up scams**: The seller arranges for the buyer to view equipment at a farm that isn't theirs. The buyer sees a real tractor, pays, and returns to collect it — only to find the actual farm owner knows nothing about the sale.
- **Cloned dealer listings**: Scammers create fake profiles mimicking real agricultural dealers, using their name, logo, and stock photos.

## Should you buy a tractor on Facebook Marketplace?

**The honest answer: proceed with extreme caution.** Facebook Marketplace can connect you with genuine sellers, but the platform has very limited buyer protection for high-value items paid by bank transfer.

### If you do use Marketplace:

**Before paying:**
- **Visit the equipment in person** — never pay for machinery you haven't physically seen and inspected
- **Verify the seller's identity** — check their Facebook profile history, mutual connections, and previous selling activity
- **Check the farm or business** — if they claim to be a dealer, look them up on Companies House. If they claim to be a farmer, verify the farm exists
- **Get documentation** — ask for the V5C (if road-registered), service history, and proof of ownership
- **Run a bank account check** — verify the bank details match the seller's name

**Payment:**
- **Never send the full amount by bank transfer** before collecting the equipment
- **Pay a small deposit** (if any) and the balance in person on collection
- **Consider using a third-party escrow service** for very high-value purchases
- **Pay by credit card where possible** for Section 75 protection on amounts over £100

**On collection:**
- **Bring someone with you** — both for safety and as a witness
- **Check serial numbers** against any documentation
- **Get a signed receipt** with the seller's name, address, and the equipment details

## Safer alternatives to Facebook Marketplace

For farm machinery, consider these platforms with better verification:

- **Agricultural dealers** — established dealers with a physical premises and reputation
- **Farm machinery auction houses** — regulated with buyer protections
- **Specialist sites** like Agritrader, Mascus, or Farm Marketplace — many verify sellers
- **Local agricultural shows and sales**

## Verify before you pay

Whether you're buying from Facebook Marketplace, a classified ad, or a new supplier, always check who you're paying before transferring money.

**[Run a free check now →](/verify)**

WhoAmIPaying verifies that the bank account matches the seller's name, checks company registrations, validates VAT numbers, and searches online reviews — all in under 30 seconds. When you're spending thousands on farm equipment, a 30-second check is a no-brainer.`,
  },
];

async function seed() {
  console.log(`Seeding ${posts.length} blog posts...`);

  for (const post of posts) {
    const { error } = await (supabase as any).from("blog_posts").upsert(
      post,
      { onConflict: "slug" }
    );

    if (error) {
      console.error(`Failed to insert "${post.slug}":`, error.message);
    } else {
      console.log(`✓ ${post.slug}`);
    }
  }

  console.log("Done!");
}

seed();
