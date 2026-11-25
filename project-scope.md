## Problem
We get a large number of daily support tickets that are then reviewed and answered by a human support agent.
Many of the questions are already answered in an existing knowledge base, so writing canned responses over and over
is a waste of human potential and a big time suck.

## Solution
An AI powered ticketing system that automatically reads incoming emails for a given email address, analyses the request
and creates a response for all tickets that don't need real human intervention.

The goal is to remove humans from the loop as much as possible. This gives faster responses and also covers nights
and weekends, when no human agent is available.

## Context
This is a demo/tutorial project. It will not be used with real customers, so data privacy and EU/GDPR compliance are
out of scope.

## Users and roles
- **Admin**: created when the system is deployed. Can create additional agents.
- **Agent**: a human support agent who logs in to view and handle tickets.
- **Customer**: sends emails to the support address. Customers do not log in.

## Tickets
Each ticket is created from an incoming email.

**Statuses**
- Open
- Resolved
- Closed

**Categories** (each ticket belongs to exactly one)
- General question
- Technical question
- Refund request

## AI auto-response
1. A new email arrives and a ticket is created.
2. The AI analyses the request and assigns a category.
3. The AI searches the knowledge base for an answer.
4. If it finds the answer in the knowledge base, it sends the reply to the customer without human intervention.
5. If it does not find an answer, the ticket stays open for a human agent.

## Knowledge base
The knowledge base is currently a single Google Doc.

## Features
- Receive support emails and create tickets 
- Auto-generate human-friendly responses using a knowledge base 
- Ticket list with filtering and sorting
- Ticket detail view 
- AI-powered ticket classification 
- AI summaries 
- Al-suggested replies 
- User management (admin only) 
- Dashboard to view and manage all tickets

## Out of scope
- Data privacy and EU/GDPR compliance (demo project only)
- Customer accounts and login

## Open questions
- **Email in and out**: how incoming emails are received (IMAP, Gmail API, inbound webhook such as Postmark or
  SendGrid) and how replies are sent. Not decided yet.
- **Threading**: when a customer replies to an answer, it should attach to the same ticket rather than create a new one.
- **Auto-reply loops**: out-of-office replies, bounces and spam must not trigger AI responses.
- **Statuses**: what is the difference between "resolved" and "closed"? Who or what moves a ticket into each one?
  Does an AI-answered ticket become resolved automatically? What happens when a customer replies to a resolved ticket?
- **Refund requests**: can the AI auto-answer these if the knowledge base covers them, or should they always go to
  a human?
- **"Found the answer"**: how does the AI decide it found the answer (confidence threshold, matching section of the doc)?
  Should replies quote or link the knowledge base section they are based on?
- **Knowledge base access**: is the Google Doc read live through the Google Docs API, exported once, or synced on a
  schedule? How does the system pick up edits?
- **Human replies**: can agents write and send replies from the detail view?
- **Assignment**: are open tickets assigned to a specific agent, or shared in one queue?
- **Volume**: roughly how many tickets per day should the demo handle?
