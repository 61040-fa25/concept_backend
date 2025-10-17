# Design File

## Changes and Issues

For this assignment, a lot of the work for me was more on the concept side of things. After getting feedback from assignment 2, I realized there was actually a lot of work that I needed to do in terms of: simplifying my concepts, modularizing even further, and clarifying states, actions, and types within my concept.
- Specifically, PlaylistHealth is no longer going to worry about handling the ability to reverse changes since it causes a lot of additional complexity not only for the LLM and a designer, but when writing the concept down again when modularizing, I realized that I was potentially overloading the concept. 
- Another issue was that LibraryCache referenced the PlatformLink concept to which I've now handled them to all be separate and work individually
- I was using generic types such as User and Tracks but I've now defined them to be in terms of ids when used in concepts so that it is defined and easier to understand.
- Concepts, such as SwipeSessions, now have additional functions that should make actions more individual and easy to understand. (no more confusion)
- I tried to spend time revitalizing some of my concepts but I think it might be worthwhile exploring things to trim still

Most of my issues came from before context with trying to rework my concepts. I realized that in implementing them, some of the functions would be too overloaded, and as a result, our testing would have be incredibly extensive to the point where one might consider splitting the module up. Even if the functions were not overloaded, some of the feedback I received was that my functions were too vague and confusing as certain actons could get mixed up or were being interchangably used with others.

## Interesting Pointers

1. Model Type:

I didn't realize how big of a difference the model type really was unless it is just placebo, however, I first ran the implementation with 2.5-flash and then realized that deeper longer thinking would be more valuable in implementing the model. This, I believed, led to better results

2. Background Docs

I really wish I had played around with background docs a bit more effectively. I think I spent a lot of time refining the concepts on my own and even working with an LLM to fix the syntax, however, I think it could have been even more efficient to give the context tool even more documents to work with. I have added those documents which can produce better results! However, I'm not sure if it was a bug on my end the first time, but I added all the documents when testing and it seemed to reproduce the implementation causing the tests to be different than from the implementation.md document.

3. Deeper thinking -> better reasoned logic, less focus on small detail?

I appreciated having a more complex model do the logic and reasoning but it seems that somewhere along the lines, the model seems to forget some context or just skip over steps and forget to complete the syntax. This was specifically seen in testing where the context tool just jumped into trace without ever closing the javascript. Resolved manually

4. Type checking

The model seemed to do super well in terms of maintaining the variable and types throughout the code, however, there were some small instances where the equality relationship between ids and strings caused bugs. This was resolved manually.

5. If implementation wasn't present when testing, it built it first

Nothing crazy here, I just thought it was super cool that I had accidentally forgotten to implement before testing, and the context tool was able to implement and then build the tests. Similar to the issues perhaps seen in 2

6. The implementation/coding process is rigorous

Reading through a lot of the context reasoning, it seemed to always have a step of refinement and adjusting which meant that the model was working through iterations of the tests it was building to make sure it worked. 

7. Imports seemed to break sometimes

Tool sometimes gave incorrect imports