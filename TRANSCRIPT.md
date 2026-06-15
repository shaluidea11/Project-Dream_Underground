# Presentation Transcript

Good morning everyone.

This is a Shopper Marketing Cloud, not a Sales Cloud. Unlike traditional CRM platforms that focus on sales pipelines and support tickets, this platform is built specifically for marketers. Every feature is designed to answer three important questions:

* Who are my customers?
* What should I do next?
* How did my campaigns perform?

To solve these problems, I have integrated AI throughout the platform. AI helps clean customer data, create customer segments from natural language descriptions, and generate campaign ideas and marketing content.

Before starting the demo, I'd like to briefly talk about security. User credentials are protected using both salting and hashing. While many systems use only hashing, I have implemented salted hashing to provide an additional layer of protection for sensitive user data.

If you would like to test the application yourself, the demo credentials are available in the GitHub repository's README file.

Now let me walk you through the platform.

The first section is Data Upload.

Here, marketers can upload customer CSV files, order CSV files, or other datasets. During ingestion, the system automatically detects the schema, standardizes data such as emails and phone numbers, and performs fuzzy matching to identify duplicate records.

As you can see, the file is being processed. In this example, 10 records were processed. Existing customer profiles were updated, and duplicate entries were merged into a single unified customer profile.

For example, if the same customer exists multiple times with slight differences in their information, the system identifies them as the same person and creates a single customer profile instead of multiple fragmented records.

Next, let's move to the Customer 360 section.

This provides a complete view of every customer. We can see metrics such as total spend, total orders, preferred communication channels, engagement history, and customer behavior patterns. This gives marketers a single source of truth about their customers.

Now let's move to my favorite feature, AI Segmentation.

Traditionally, marketers need to manually build complex filters. Instead, I can simply describe an audience in plain English.

For example:

"High-value customers who haven't ordered in the last 30 days."

The platform converts this natural language description into structured filters and identifies the matching customers automatically.

Currently, the AI segmentation feature is still being refined, so I have also provided a manual segment builder as a backup option. Using either method, marketers can quickly create and save customer segments for future campaigns.

In this example, the system creates a segment containing customers who match the criteria and provides a preview before saving the segment.

Now let's move to Campaign Creation.

Here, marketers can define a campaign objective.

For example:

"Bring inactive customers back."

The AI then generates campaign recommendations and marketing content based on that goal.

Currently, the platform uses the Gemini API for content generation because it provides a free tier suitable for development and testing.

After selecting the target audience, marketers can choose their preferred communication channel and schedule the campaign.

Once everything is configured, the campaign can be launched. The marketer can later reschedule, edit, or monitor the campaign directly from the dashboard.

Now let's look at the Analytics section.

This is where marketers can measure campaign performance.

Here we can see how many messages were sent, delivered, opened, clicked, and converted. We can also view campaign timelines and customer engagement metrics.

For example, when a campaign is executed, the platform tracks the complete customer journey from message delivery all the way to conversion. This allows marketers to understand which campaigns are working and where improvements can be made.

Now let's move to the technical architecture behind the platform.

Architecturally, the system consists of three deployed applications and two managed data services.

The frontend is built using Next.js and serves as the primary user interface.

The AI Brain service acts as the intelligence layer of the system. It handles audience segmentation, campaign planning, and AI-powered recommendations.

The backend API service is built using Fastify and runs independently. This separation ensures scalability and clean service boundaries.

One of the most important architectural decisions I made was around callback processing.

In real-world systems, delivery events, click events, and conversion events can arrive out of order due to network delays.

To solve this, I implemented a monotonic status progression system.

Every status is assigned a rank. A callback can only move a campaign forward if its rank is higher than the current status.

This prevents older events from overwriting newer events and guarantees accurate campaign tracking even when callbacks arrive in the wrong order.

Although the implementation is only a few lines of code, it makes the difference between accurate analytics and corrupted analytics.

Now let's talk about how AI interacts with the data.

This was one of the most critical design decisions in the project.

The AI model never directly generates SQL queries that are executed against the database.

Instead, the system follows a controlled pipeline.

First, the AI converts a user's natural language request into a structured intent.

Next, the request passes through validation layers that verify every field, operation, and allowed action.

Only after passing all validations does the system generate safe database operations.

Because of this architecture, even a malicious prompt cannot directly inject SQL into the database.

The model's output is treated as untrusted until it passes multiple validation checkpoints.

This security boundary is one of the strongest guarantees in the system.

Finally, I would like to discuss how I built the project.

I used an AI coding assistant extensively during development. However, the key value was not that I used AI—it was how I directed it.

I maintained a living decision log throughout development.

Every architectural choice required documented reasoning and validation before being accepted into the system.

For example, during development, an AI-generated segmentation plan incorrectly interpreted customer identifiers and email mappings.

Instead of accepting the output blindly, I manually reviewed it, corrected the schema, documented the decision, and ensured the issue would never reoccur.

This process was followed repeatedly throughout development.

AI generated suggestions, but every critical architectural decision, validation rule, security boundary, and system design choice was manually reviewed and approved.

That is why I consider this platform not just an AI-assisted project, but an engineered system with deliberate architectural decisions behind every component.

To summarize, this Shopper Marketing Cloud helps marketers unify customer data, create intelligent customer segments, launch personalized campaigns, track campaign performance, and do all of this through a secure, AI-powered architecture.

Thank you for your time. I would be happy to answer any questions.
