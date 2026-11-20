# Product Requirements Document (PRD)

## Darasa --- Community-Curated Culinary Discovery Platform

**Document version:** 1.0\
**Product type:** Responsive web application prototype\
**Primary launch area:** Batang Regency, Central Java, Indonesia\
**Source:** *Software Development Proposal (2026)* (2026)

------------------------------------------------------------------------

## 1. Product Overview

### 1.1 Product Summary

Darasa is a community-curated web platform that helps people discover
culinary businesses in Batang Regency, including small and lesser-known
food businesses that may have limited digital visibility.

The platform presents culinary places with their location, photos,
ratings, and user reviews. Community members can contribute by
submitting new places, ratings, reviews, and photos. Business owners are
not required to create or actively manage an account for their
businesses to appear on the platform. Owners who are ready to manage
their digital presence can claim an existing business profile and, after
approval, manage its information and respond to reviews.

Darasa uses two ranking modes---**Explore Score** and **Hidden Gem
Score**---to support discovery based on quality as well as exposure,
rather than popularity alone.

### 1.2 Problem Statement

Batang Regency's economic activity, including growth around the Batang
Integrated Industrial Estate (KITB), increases the movement of local
residents, workers, and visitors and their need for accessible
information about nearby food options.

At the same time, many local culinary SMEs have limited capacity or
digital literacy to maintain online promotional profiles. Good
businesses may remain difficult to discover when they have few reviews
or little online exposure.

Darasa addresses this gap through community contributions and a
platform that does not depend on business owners being digitally active.

### 1.3 Product Vision

Make local culinary businesses in Batang easier to discover through
reliable, community-maintained information, while giving lesser-known
businesses a fairer opportunity to be seen.

### 1.4 Product Goals

1.  Help residents, visitors, and incoming workers find culinary places
    in Batang Regency.
2.  Present useful business information, including location, photos,
    ratings, and reviews.
3.  Allow registered users to contribute new places and reviews.
4.  Support discovery of quality businesses that have relatively low
    exposure through Hidden Gem.
5.  Improve information reliability through validation, verification,
    and anomaly flagging.
6.  Give business owners an optional way to claim and manage their
    profiles.

### 1.5 Non-Goals

The prototype is not intended to provide: - Food ordering or
reservations. - Online payments or payment processing. - Food delivery
or courier management. - Point-of-sale (POS) or cashier operations. -
Full business operations or inventory management.

------------------------------------------------------------------------

## 2. Target Users and Roles

Darasa has four principal roles.

### 2.1 Visitor

A visitor can use discovery features without submitting contributions.

**Needs** - Find culinary places. - Search and filter places by keyword,
location, or category. - View business details, photos, ratings,
reviews, and map location. - Explore Hidden Gem recommendations.

### 2.2 Registered User

A registered user can access visitor features and submit community
contributions.

**Needs** - Create an account and sign in. - Submit a new culinary
place. - Provide ratings and written reviews. - Upload photos associated
with a place or review.

### 2.3 Business Owner

A business owner can manage a business profile only after submitting a
claim and receiving approval.

**Needs** - Find and claim an existing business profile. - Complete the
claim verification process. - Update basic business information after
approval. - View available business statistics. - Reply to user reviews.

A business owner account is optional. A business can be listed through
community contributions even if its owner has not claimed the profile.

### 2.4 Administrator

Administrators oversee platform data and review submissions that require
manual attention.

**Needs** - Manage culinary place data. - Review and process
business-profile claims. - Verify business information. - Review
information or activity flagged for further inspection. - Manage
approval and verification outcomes.

------------------------------------------------------------------------

## 3. Product Scope

### 3.1 In-Scope Features

-   User registration and login.
-   Role-aware access for users, business owners, and administrators.
-   Culinary place discovery through Explore.
-   Keyword search and category/location filters.
-   Hidden Gem discovery mode.
-   Culinary place detail pages.
-   Community submission of culinary places.
-   Ratings, written reviews, and photo uploads.
-   Business-profile claim submission and approval.
-   Business-owner dashboard.
-   Business profile management after claim approval.
-   Owner replies to reviews.
-   Community and owner verification statuses.
-   Z-Score-based anomaly flagging to support manual review.
-   Map and geolocation integration.

### 3.2 Geographic Scope

The initial product scope is culinary places in **Batang Regency,
Central Java, Indonesia**. Expansion to other areas is a possible future
direction, not a requirement for the initial prototype.

------------------------------------------------------------------------

## 4. Functional Requirements

Priority definitions: - **Must:** Required for the prototype's core
experience. - **Should:** Important supporting capability. - **Could:**
Optional capability where implementation capacity allows.

### 4.1 Authentication and Account Management

  -----------------------------------------------------------------------
  ID                      Requirement             Priority
  ----------------------- ----------------------- -----------------------
  FR-001                  The system must provide Must
                          a registration page for 
                          new users.              

  FR-002                  The system must provide Must
                          a login page for        
                          registered users.       

  FR-003                  Registration and login  Must
                          forms must validate     
                          submitted data and show 
                          appropriate error       
                          messages when input is  
                          invalid.                

  FR-004                  The system must         Must
                          associate               
                          contributions, such as  
                          reviews, with the       
                          submitting user's       
                          account.                

  FR-005                  The system must support Must
                          role-aware access for   
                          general users, approved 
                          business owners, and    
                          administrators.         
  -----------------------------------------------------------------------

### 4.2 Explore, Search, and Filters

  -----------------------------------------------------------------------
  ID                      Requirement             Priority
  ----------------------- ----------------------- -----------------------
  FR-006                  The system must display Must
                          a browsable list of     
                          culinary places.        

  FR-007                  Users must be able to   Must
                          search for culinary     
                          places using keywords.  

  FR-008                  Users must be able to   Must
                          filter results by       
                          available categories    
                          and location.           

  FR-009                  The Explore experience  Must
                          must provide access to  
                          the Hidden Gem mode.    

  FR-010                  Search and filter       Must
                          results must show       
                          relevant place          
                          information to help     
                          users choose a          
                          destination.            
  -----------------------------------------------------------------------

### 4.3 Culinary Place Details

  -----------------------------------------------------------------------
  ID                      Requirement             Priority
  ----------------------- ----------------------- -----------------------
  FR-011                  Each culinary place     Must
                          detail page must        
                          display the place name  
                          and available basic     
                          information.            

  FR-012                  The detail page must    Must
                          display available       
                          photos, average rating, 
                          and user reviews.       

  FR-013                  The detail page must    Must
                          display the place       
                          location and support    
                          map-based location      
                          information.            

  FR-014                  The detail page should  Should
                          display business        
                          information such as     
                          address and opening     
                          hours when those        
                          details are available   
                          and have been supplied  
                          or verified.            
  -----------------------------------------------------------------------

### 4.4 Community Place Contributions

  -----------------------------------------------------------------------
  ID                      Requirement             Priority
  ----------------------- ----------------------- -----------------------
  FR-015                  Registered users must   Must
                          be able to submit a new 
                          culinary place.         

  FR-016                  A place submission must Must
                          support a name, GPS     
                          location, and category. 

  FR-017                  A place submission must Should
                          support an initial      
                          photo when available.   

  FR-018                  The system must         Must
                          validate submitted      
                          place data before       
                          accepting it for        
                          display.                

  FR-019                  Submitted place         Must
                          information must be     
                          subject to the          
                          platform's validation   
                          or verification         
                          process.                
  -----------------------------------------------------------------------

### 4.5 Ratings, Reviews, and Photos

  -----------------------------------------------------------------------
  ID                      Requirement             Priority
  ----------------------- ----------------------- -----------------------
  FR-020                  Registered users must   Must
                          be able to submit a     
                          rating for a culinary   
                          place.                  

  FR-021                  Registered users must   Must
                          be able to write a      
                          review for a culinary   
                          place.                  

  FR-022                  Registered users must   Should
                          be able to upload       
                          photos associated with  
                          a place or review.      

  FR-023                  The system must         Must
                          validate review and     
                          rating inputs before    
                          storing them.           

  FR-024                  Reviews and ratings     Must
                          must be linked to the   
                          submitting user account 
                          to support moderation   
                          and anomaly analysis.   
  -----------------------------------------------------------------------

### 4.6 Explore Ranking

  -----------------------------------------------------------------------
  ID                      Requirement             Priority
  ----------------------- ----------------------- -----------------------
  FR-025                  The system must         Must
                          calculate an Explore    
                          Score for culinary      
                          places.                 

  FR-026                  The Explore Score must  Must
                          consider average        
                          rating, review volume,  
                          review recency, and     
                          verification status.    

  FR-027                  The Explore experience  Must
                          must use the Explore    
                          Score to support a      
                          balanced ordering of    
                          places.                 
  -----------------------------------------------------------------------

The proposal's initial Explore Score formula is:

`Explore Score = (0.5 × Average Rating) + (0.2 × log(1 + Review Count)) + (0.2 × Recency Factor) + (0.1 × Verification Status)`

The proposal does not specify the exact normalization, time window, or
numeric encoding for the Recency Factor and Verification Status. These
values must be defined and documented during implementation before the
score is used for production ranking.

### 4.7 Hidden Gem

  -----------------------------------------------------------------------
  ID                      Requirement             Priority
  ----------------------- ----------------------- -----------------------
  FR-028                  The system must provide Must
                          a dedicated Hidden Gem  
                          discovery mode.         

  FR-029                  Hidden Gem must         Must
                          prioritize places with  
                          high ratings and        
                          relatively few reviews. 

  FR-030                  The initial Hidden Gem  Must
                          calculation must apply  
                          only to places with an  
                          average rating of at    
                          least 4.0.              

  FR-031                  The Hidden Gem page     Must
                          must display the places 
                          that meet its selection 
                          criteria.               
  -----------------------------------------------------------------------

The proposal's initial Hidden Gem Score formula is:

`Hidden Gem Score = Average Rating × (1 / (1 + Review Count))`

Eligibility condition:

`Average Rating ≥ 4.0`

### 4.8 Verification and Anomaly Flagging

  -----------------------------------------------------------------------
  ID                      Requirement             Priority
  ----------------------- ----------------------- -----------------------
  FR-032                  The system must support Must
                          a Community Verified    
                          status for culinary     
                          place information.      

  FR-033                  The system must support Must
                          an Owner Verified       
                          status after an owner   
                          claim has been reviewed 
                          and approved.           

  FR-034                  The system must provide Must
                          an administrator        
                          process for reviewing   
                          information that        
                          requires manual         
                          verification.           

  FR-035                  The system must use     Should
                          Z-Score analysis to     
                          flag unusual rating     
                          values or activity      
                          patterns for further    
                          inspection.             

  FR-036                  An anomaly flag must be Must
                          treated as an           
                          indication for review,  
                          not as automatic proof  
                          of fraud or misconduct. 
  -----------------------------------------------------------------------

### 4.9 Business Profile Claiming

  -----------------------------------------------------------------------
  ID                      Requirement             Priority
  ----------------------- ----------------------- -----------------------
  FR-037                  A business owner must   Must
                          be able to submit a     
                          claim for an existing   
                          culinary place profile. 

  FR-038                  The system must record  Must
                          the claim for           
                          administrator review.   

  FR-039                  The system must allow   Must
                          an administrator to     
                          approve or reject a     
                          claim.                  

  FR-040                  The system must grant   Must
                          profile-management      
                          access only after the   
                          claim is approved.      

  FR-041                  The system must         Should
                          communicate the claim   
                          outcome to the claimant 
                          through an appropriate  
                          status or message.      
  -----------------------------------------------------------------------

### 4.10 Business Owner Dashboard

  -----------------------------------------------------------------------
  ID                      Requirement             Priority
  ----------------------- ----------------------- -----------------------
  FR-042                  An approved business    Must
                          owner must be able to   
                          access a business       
                          dashboard.              

  FR-043                  The dashboard must      Must
                          allow the owner to      
                          update basic business   
                          information.            

  FR-044                  The dashboard must      Should
                          display available       
                          business statistics.    

  FR-045                  The dashboard should    Should
                          allow the owner to      
                          reply to user reviews.  
  -----------------------------------------------------------------------

### 4.11 Administrator Management

  -----------------------------------------------------------------------
  ID                      Requirement             Priority
  ----------------------- ----------------------- -----------------------
  FR-046                  Administrators must be  Must
                          able to manage culinary 
                          place data.             

  FR-047                  Administrators must be  Must
                          able to review          
                          business-profile        
                          claims.                 

  FR-048                  Administrators must be  Must
                          able to verify business 
                          information and manage  
                          verification outcomes.  

  FR-049                  Administrators must be  Should
                          able to inspect         
                          submissions or activity 
                          flagged for further     
                          review.                 
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 5. Key User Workflows

### 5.1 Discover a Culinary Place

1.  A visitor opens Darasa.
2.  The visitor opens Explore.
3.  The visitor enters a keyword or applies available location/category
    filters.
4.  The system retrieves and ranks matching culinary places.
5.  The visitor selects a place.
6.  The system displays the place's available details, photos, rating,
    reviews, and map location.

### 5.2 Register and Log In

1.  A user opens the registration page if they do not have an account.
2.  The user enters the required registration information.
3.  The system validates the submitted information.
4.  If valid, the system creates the account.
5.  The user can then log in using their credentials.
6.  If the user already has an account, they can proceed directly to
    login.
7.  The system displays an appropriate error message when submitted
    credentials or data are invalid.

### 5.3 Submit a Culinary Place

1.  A visitor chooses the option to add a place.
2.  If the visitor is not logged in, the system directs them to login or
    registration.
3.  The registered user enters the place name, GPS location, and
    category.
4.  The user may add an initial photo if available.
5.  The system validates the submission.
6.  The submission enters the platform's validation/verification process
    before being treated as reliable public information.

### 5.4 Submit a Rating or Review

1.  A user opens a culinary place detail page.
2.  The user chooses to submit a rating or review.
3.  If the user is not logged in, the system directs them to login or
    registration.
4.  The user submits a rating, written review, and optional photo.
5.  The system validates and stores the contribution with its user
    association.
6.  The contribution becomes available according to the platform's
    validation and moderation rules.

### 5.5 Explore Hidden Gem

1.  A user opens the Hidden Gem page.
2.  The system retrieves culinary place records.
3.  The system selects places with an average rating of at least 4.0.
4.  The system calculates the Hidden Gem Score for eligible places.
5.  The system displays the filtered places in score order.

### 5.6 Claim a Business Profile

1.  A business owner finds the existing profile for their business.
2.  The owner starts the claim process and submits the required claim
    information.
3.  The system records the claim as awaiting review.
4.  An administrator reviews the claim and supporting information.
5.  The administrator approves or rejects the claim.
6.  If approved, the system grants the owner access to manage the
    profile.
7.  If rejected, the owner does not receive profile-management access.

### 5.7 Manage a Business Profile

1.  An approved owner signs in.
2.  The owner opens the business dashboard.
3.  The owner updates basic business information.
4.  The owner views available statistics.
5.  The owner may reply to reviews.
6.  The system saves the permitted changes.

### 5.8 Review Verification and Anomaly Flags

1.  The system evaluates relevant data for verification and unusual
    patterns.
2.  The system assigns or updates applicable verification information
    and flags potential anomalies.
3.  An administrator reviews cases that require manual attention.
4.  The administrator determines the appropriate verification or
    moderation outcome.
5.  A Z-Score flag alone must not be treated as a final finding of
    manipulation.

------------------------------------------------------------------------

## 6. Data and Business Rules

### 6.1 Core Data Entities

The proposal implies the following core data entities. Exact fields,
relationships, and constraints are to be finalized in the database
design.

  -----------------------------------------------------------------------
  Entity                              Purpose
  ----------------------------------- -----------------------------------
  User                                Stores account information and
                                      role/access information.

  Culinary Place                      Stores a place's name, category,
                                      GPS location, photos, and basic
                                      business information.

  Rating / Review                     Stores user-submitted ratings,
                                      written reviews, and their
                                      association with a place and user.

  Place Photo                         Stores or references images
                                      submitted for a culinary place or
                                      review.

  Business Claim                      Records an owner's request to
                                      manage an existing place profile
                                      and its review status.

  Verification Status                 Records community or owner
                                      verification information.

  Owner Reply                         Stores a business owner's response
                                      to a user review.

  Place Statistics                    Supports the business dashboard's
                                      available statistics.

  Anomaly Flag                        Records rating or activity patterns
                                      that require further inspection.
  -----------------------------------------------------------------------

### 6.2 Business Rules

1.  A culinary place may be listed without an active business-owner
    account.
2.  Only registered users can submit place contributions, ratings, and
    reviews.
3.  Contributions must be associated with the account that submitted
    them.
4.  A business owner may manage a profile only after a claim is
    approved.
5.  Community verification and owner verification are distinct statuses.
6.  Hidden Gem eligibility requires an average rating of at least 4.0
    under the initial proposal.
7.  Explore ranking considers rating, review volume, recency, and
    verification status.
8.  Z-Score analysis is used to flag possible anomalies for review; it
    does not automatically determine misconduct.
9.  Map and geolocation features depend on the availability and
    applicable usage limits of Google Maps Platform API.

### 6.3 Ranking Implementation Notes

The proposal supplies initial formulas but does not fully define all
input scales. Before implementation, the team must specify: - The time
window and calculation method for the Recency Factor. - The numeric
representation of Verification Status. - Whether rating and other score
components require normalization. - How places with missing ratings, no
reviews, or incomplete verification data are handled. - Tie-breaking
behavior when two places have the same score. - How often ranking values
are recalculated.

These are implementation decisions, not additional product capabilities
asserted by the proposal.

------------------------------------------------------------------------

## 7. Non-Functional Requirements

  -----------------------------------------------------------------------
  ID                      Category                Requirement
  ----------------------- ----------------------- -----------------------
  NFR-001                 Usability               The interface must be
                                                  clear, consistent, and
                                                  easy to navigate for
                                                  users with different
                                                  levels of digital
                                                  literacy.

  NFR-002                 Security                The system must provide
                                                  authentication and
                                                  password protection.

  NFR-003                 Input Safety            User inputs must be
                                                  validated to reduce
                                                  invalid submissions and
                                                  misuse.

  NFR-004                 Performance             Search and filtering
                                                  should remain
                                                  responsive through
                                                  suitable query handling
                                                  and database indexing.

  NFR-005                 Data Reliability        Place information,
                                                  ratings, and reviews
                                                  must have validation
                                                  and verification
                                                  processes.

  NFR-006                 Maintainability         The application must
                                                  separate frontend,
                                                  backend/API, and
                                                  database
                                                  responsibilities.

  NFR-007                 Compatibility           The web application
                                                  must be accessible
                                                  through supported web
                                                  browsers on devices
                                                  with an internet
                                                  connection.

  NFR-008                 Modularity              Major modules should be
                                                  developed and tested
                                                  separately before
                                                  integration.
  -----------------------------------------------------------------------

The proposal does not provide numerical service-level targets for
response time, uptime, concurrency, or recovery. Those targets should be
established if the prototype moves toward production use.

------------------------------------------------------------------------

## 8. UX and Interface Requirements

The interface should prioritize accessibility, clear information
hierarchy, consistent components, and responsive presentation.

The proposal identifies the following principal screens:

1.  **Login:** Clear authentication form.
2.  **Register:** Account creation form.
3.  **Explore:** Culinary place listings, search, filters, and access to
    Hidden Gem.
4.  **Culinary Place Detail:** Photo gallery, place identity, rating,
    reviews, and location.
5.  **Claim Business Profile:** Claim information and claim
    status/process.
6.  **Hidden Gem:** A list of highly rated places with relatively low
    review volume.
7.  **Review Culinary Place:** Rating, review, and optional photo
    contribution.
8.  **Verify Claim:** Administrator interface for reviewing and
    processing claims.
9.  **Business Dashboard:** Profile management, available statistics,
    and review replies.

The proposal's wireframes on pages 16--19 illustrate the intended screen
structure. They are structural references; the final visual design may
be refined by the team.

------------------------------------------------------------------------

## 9. Technical Architecture and Technology Stack

### 9.1 Architecture

Darasa uses a three-part application architecture:

-   **Frontend:** Presents the interface and handles user interactions.
-   **Backend/API:** Handles authentication, culinary place data,
    reviews, claims, verification, and score calculations.
-   **Database:** Stores users, places, ratings, reviews, verification
    statuses, and supporting data.

Google Maps Platform API supports map display and geolocation.

### 9.2 Proposed Technology Stack

  -----------------------------------------------------------------------
  Area                    Technology              Role
  ----------------------- ----------------------- -----------------------
  Primary language        TypeScript              Main programming
                                                  language across the
                                                  system.

  Runtime / package       Bun                     Runtime and package
  manager                                         management.

  Monorepo / build        Turborepo               Supports build
  orchestration                                   processes.

  Linting / formatting    Biome                   Code linting and
                                                  formatting.

  Frontend library        React                   User interface.

  Frontend build tool     Vite                    Frontend build tooling.

  Routing                 React Router            Frontend navigation.

  Styling                 Tailwind CSS            Interface styling.

  Frontend-backend        Eden                    Type-safe communication
  communication                                   between frontend and
                                                  backend.

  Frontend server toolkit Nitro                   Server toolkit on the
                                                  frontend side.

  Backend API framework   ElysiaJS                API implementation.

  ORM                     Drizzle ORM             Database query and data
                                                  access management.

  Relational database     PostgreSQL              Primary data storage.

  Mapping / geolocation   Google Maps Platform    Maps and location
                          API                     features.

  Owner communication     WhatsApp Business API   Lightweight
  channel                                         communication channel
                                                  for business owners,
                                                  where used.

  UI/UX design            Figma                   Wireframes and
                                                  interface design.

  Version control         Git and GitHub          Source control and
                                                  collaboration.

  Deployment              Docker and Dokploy      Deployment process.

  Development editor      Visual Studio Code      Code editing.
  -----------------------------------------------------------------------

The proposal also mentions AI-assisted development tools, including
Deepseek-4.1-Flash, Gemini-4-Hydrogen, OMP (Oh My Phi), Antigravity CLI,
and Claude Code. These are development aids rather than runtime product
dependencies.

------------------------------------------------------------------------

## 10. Validation, Testing, and Development Approach

### 10.1 Development Method

The project uses a **linear-iterative** development model. The main
stages are:

1.  Requirements identification.
2.  Analysis.
3.  System and interface design.
4.  Implementation.
5.  Testing and evaluation.
6.  Iteration based on test findings.

Development is modular so authentication, Explore, contributions,
ranking, verification, and the business dashboard can be tested
independently before integration.

### 10.2 Testing Approach

The proposal identifies: - Simple unit testing of individual modules. -
Internal functional testing. - Limited evaluation with prospective
users. - Separate testing of modules before integration.

### 10.3 Minimum Acceptance Criteria

The prototype can be considered to meet its core product requirements
when the following can be demonstrated:

-   [ ] Visitors can open Explore and browse culinary places.
-   [ ] Visitors can search and filter places using available criteria.
-   [ ] Visitors can open a place detail page and view available
    location, photos, ratings, and reviews.
-   [ ] Users can register and log in.
-   [ ] Registered users can submit a culinary place with the required
    information.
-   [ ] Registered users can submit ratings and reviews.
-   [ ] The system associates contributions with the submitting user.
-   [ ] Explore Score is calculated using the proposal's stated factors.
-   [ ] Hidden Gem displays eligible places with an average rating of at
    least 4.0 and uses the stated initial score formula.
-   [ ] A business owner can submit a claim for an existing profile.
-   [ ] An administrator can review and approve or reject a claim.
-   [ ] Only an approved owner can manage the claimed profile.
-   [ ] Approved owners can access the dashboard and update basic
    profile information.
-   [ ] Verification statuses can distinguish community verification
    from owner verification.
-   [ ] Potential anomalies can be flagged for review without being
    treated as automatic proof of misconduct.
-   [ ] The application can be accessed through a supported web browser.

------------------------------------------------------------------------

## 11. External Services and Operational Considerations

### 11.1 External Dependencies

-   Google Maps Platform API is used for mapping and geolocation,
    subject to service availability, quotas, and applicable usage
    limits.
-   WhatsApp Business API is identified as a lightweight communication
    channel for business owners where used.
-   Cloud hosting and a managed database may be used to deploy and
    operate the prototype.

### 11.2 Cost Considerations

The proposal gives the following initial annual estimates:

  Item                                                           Initial Estimate
  -------------------------- ----------------------------------------------------
  Domain                                                       IDR 150,000 / year
  Managed database                                           IDR 1,800,000 / year
  Google Maps Platform API                                   IDR 1,200,000 / year
  WhatsApp Business API                                        IDR 600,000 / year
  Hosting                      A free tier may be used during the prototype stage

These figures are preliminary estimates from the proposal and must be
checked against actual provider plans, quotas, and usage. They are not
guaranteed prices or confirmed operating costs.

### 11.3 Potential Sustainability Options

The proposal identifies possible future sustainability options: -
Promoted business listings. - Owner verification services. - Aggregated
data partnerships.

These are potential business models only. They have not been established
as realized revenue and require market validation and actual cost
measurement.

------------------------------------------------------------------------

## 12. Risks, Constraints, and Open Questions

### 12.1 Identified Constraints

-   Initial geographic focus is limited to Batang Regency.
-   The product depends on internet access and external mapping services
    for relevant features.
-   Business owners are not required to participate; therefore, some
    business information may be maintained primarily through community
    contributions.
-   Owner management access depends on a successful claim review.
-   Ranking and anomaly detection are initial approaches and may need
    refinement after testing.
-   The prototype excludes ordering, payment, delivery, and POS
    functionality.

### 12.2 Open Questions for the Development Team

The proposal does not fully specify the following details. They should
be resolved during detailed design:

1.  What exact fields and evidence are required to submit and verify a
    business claim?
2.  What evidence is sufficient for Community Verified and Owner
    Verified statuses?
3.  What are the exact validation and moderation rules for newly
    submitted places, reviews, and photos?
4.  What are the accepted rating scale and review length limits?
5.  Can a user submit more than one review for the same place, and what
    are the rules for editing or deleting a review?
6.  How is the Recency Factor calculated, and what time window is used?
7.  How is Verification Status encoded in the Explore Score?
8.  What thresholds and data windows are used by Z-Score anomaly
    detection?
9.  What statistics are displayed in the business dashboard, and how are
    visits measured?
10. What communication events, if any, use WhatsApp Business API?
11. What are the retention, privacy, and access-control rules for user
    data and uploaded photos?
12. What are the target performance and availability levels for a
    production release?

These questions are intentionally listed as unresolved rather than
assigned invented product behavior.

------------------------------------------------------------------------

## 13. Future Considerations

The proposal suggests that future development may focus on:

-   Expanding the platform's geographic coverage.
-   Improving ranking algorithms.
-   Improving detection of unusual rating patterns.
-   Strengthening verification processes.
-   Testing with more users and business owners.

Any expansion should be informed by prototype evaluation and feedback
from the community and local businesses.

------------------------------------------------------------------------

## 14. Glossary

  -----------------------------------------------------------------------
  Term                                Definition
  ----------------------------------- -----------------------------------
  Darasa                           A community-curated culinary
                                      discovery platform focused
                                      initially on Batang Regency.

  Explore                             The main discovery experience for
                                      browsing, searching, and filtering
                                      culinary places.

  Explore Score                       A ranking score that combines
                                      average rating, review volume,
                                      review recency, and verification
                                      status.

  Hidden Gem                          A discovery mode that prioritizes
                                      highly rated places with relatively
                                      few reviews.

  Hidden Gem Score                    The initial score calculated from
                                      average rating and review count for
                                      eligible places.

  Crowdsourcing                       Building and maintaining platform
                                      information through contributions
                                      from community members.

  Community Verified                  A verification status associated
                                      with community-based validation.

  Owner Verified                      A verification status associated
                                      with an approved business-owner
                                      claim.

  Z-Score                             A statistical measure used by the
                                      system to flag unusual rating
                                      values or activity patterns for
                                      further inspection.

  KITB                                Kawasan Industri Terpadu Batang
                                      (Batang Integrated Industrial
                                      Estate).
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 15. Source Alignment Note

This PRD translates the requirements and product design described in the
2026 software development proposal into an English product
requirements format. It preserves the proposal's stated product scope,
roles, workflows, initial scoring formulas, technology choices, and
prototype limitations.

Where the proposal does not define implementation-level details---such
as exact validation thresholds, score normalization, claim evidence, or
performance targets---this document marks them as open questions instead
of inventing specifications.
