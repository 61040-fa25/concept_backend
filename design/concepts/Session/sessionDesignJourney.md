# Session - Design Journey
In implementing the Session concept, the first hurdle was the same as when implementing ListCreation: I needed to add a feature of ownership for authentication purposes. I added this to the state and the necessary 'requires' statements to the actions relatively easily.

With the concept updated based on this feedback, I generated the source code and test cases for the Session concept. Interestingly, these test cases were not all successful. 

![Initial test output](../../../context/design/concepts/Session/testOutput.md/20251017_174915.92b49a20.md)

In doing so, I also encountered some snags regarding whether my current concept design is at the right scale. As it stands, the concept encapsulates one Session, rather than a set of Sessions. For the sake of modularity, I feel as though this introduces some difficulties in verifying conditions for future actions. 