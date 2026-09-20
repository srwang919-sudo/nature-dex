# Provider setup (optional)

Provider-backed recognition is optional for local development. The no-credential path uses `native/services/mock-recognition.js` and does not upload photos.

## Recognition provider

The `recognizeObservation` cloud function reads `BAIDU_API_KEY` and `BAIDU_SECRET_KEY` from the cloud-function environment. The owner must enter these values in the provider/CloudBase console and must not put them in the repository, an issue, or a pull request.

The app must obtain the user's explicit consent before requesting an upload ticket. The cloud function must verify the authenticated owner, observation ID, private asset ownership, and idempotency key. Recognition output is a candidate result; the user confirms the species before a card is created.

## Optional art and reference services

The watercolor and science-text functions are separate, user-triggered services. They receive only the minimum approved input for the selected operation. A failed art request must remain a visible failure and must not silently become a successful card.

## Required verification

Before any private deployment, verify provider permissions, quotas, timeout behavior, private storage rules, cross-user isolation, deletion behavior, and the behavior for blurred, multi-subject, non-biological, unknown, and provider-failure images. Passing local mock tests does not establish provider accuracy.
