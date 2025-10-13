# Design Changes

Overall, my design has not changed. There will be a number of additional syncs that I have to add compared to what I had written to Assignment 2, but this assignment does not focus on those right now.

I chose not to include the AI augmentation that I worked on for Assignment 3. (Recap: my AI augmentation was to generate 3 alternative captions based on a user's draft caption for their post that could help improve clarity, phrasing, engagement, etc.) This decision was due to the following reasons:

1) I found during the "rich testing" portion of Assignment 3 that the LLM did very poorly at imitating some mannerisms. Specifically, if the author used very casual phrasing and slang, the LLM was generally unsuccessful at producing alternative captions with the same feeling. This would make the LLM rather unhelpful for those who purposefully want a casual tone in their captions. 

2) It would involve creating a somewhat more complicated UI for something that I don't believe adds enough value to justify it. Additionally, as an extension to (1), a solution could be to have a setting to enable/disable the AI augmentation (so that casual-toned users don't have to see a button for the AI that proves generally unhelpful), but once again this is yet another added complexity to the app that I would like to avoid given the already large scope of it.

# Interesting Moments

(Note: Pointers 1-3 are in line with the old version of my Friending concept, which can be found [here](../../context/design/concepts/Friending/Friending.md/steps/_.01d9b91b.md).)

1. The first time I asked Context to implement my old Friending concept, it created this helper function called "ensureUserExists" that creates a user if they do not already exist. At first, I felt that this was quite strange since it seemed to undermine the purpose of the precondition that users exist when creating/accepting friend requests and removing friends. I ended up getting pretty confused because I wasn't really sure how the idea of user existence was supposed to be handled if I could not rely on other concepts. However, this extra function by Context combined with some cross-analysis with other concepts made me realize that the primary issue was that my Friending concept simply had no idea of "creation." This helped me realize that I needed to create a new initialization action to fix things.

[Context's first implementation of the Friending concept](../../context/design/concepts/Friending/implementation.md/steps/response.0495f9cd.md)

2. After making an edit to the Friending specification with an initialization action (in accordance with (1)), I asked Context to re-implement the concept. Interestingly, I found that it got rather confused on the set of sentRequests and receivedRequests fields that I included in the state. For the sendRequest action, it mistakenly added a check of whether the sender existed in the receiver's set of sentRequests (which doesn't make sense). For the acceptRequest action, Context added a lot of unnecessary checks that sendRequest would check and cover already.

[Context's second implementation of the Friending concept](../../context/design/concepts/Friending/implementation.md/steps/response.ec9d0693.md)

3. When designing a complex scenario, Context itself got very mixed up. For instance, it would assert that a friend request existed between two users, believing that a previous test case created the request, when in reality no such thing ever happened.

[Context's first implementation of the tests cases for the Friending concept](../../context/design/concepts/Friending/testing.md/steps/response.cb6851da.md)

4. For the SessionLogging concept, Context came up with more error-checking scenarios than me. [Link to generated test cases](../../context/design/concepts/SessionLogging/testing.md/steps/response.c1e78707.md)

In particular, in the "Scenario: Multiple Users, Isolation, and Cross-User Interaction" test case, Context had both Alice and Bob have sessions and experimented around with the addEntry action, making sure that the sessions included the images that they did. However, Context also checked that the sessions did not include the images that they shouldn't have. In the test case, Alice's session had images 1 and 2 while Bob's session had images 3 and 5. Explicit checks that Alice's session did not include images 3 and 5 (and similarly images 1 and 2 for Bob's session) were included; I wouldn't have thought to check that, so Context did well here.

5. While re-reading my concepts' implementations and test cases one by one, I noticed that the tests generated for PasswordAuthentication were a bit different than what was generated for the other concepts. In particular, while the tests could be run and would pass successfully, no console output would be logged in spite of the many console.log statements. I ended up asking Context to rewrite the tests for PasswordAuthentication so that console output would successfully print.

[Old tests for PasswordAuthentication](../../context/design/concepts/PasswordAuthentication/testing.md/steps/response.7a36d4f4.md)
[New tests for PasswordAuthentication](../../context/design/concepts/PasswordAuthentication/testing.md/steps/response.6ac7a53b.md)

