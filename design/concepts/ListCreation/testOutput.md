# Test Output
```
ListCreationConcept ...
  should successfully create a new list ... ok (77ms)
  should prevent creating a list with the same name for the same owner ... ok (54ms)
  should allow creating a list with the same name for a different owner ... ok (51ms)
  should add tasks to a list, incrementing itemCount and assigning default order ... ok (149ms)
  should prevent adding a task that already exists in the list ... ok (15ms)
  should prevent non-owners from adding tasks to a list ... ok (38ms)
  should delete tasks from a list and adjust order numbers ... ok (133ms)
  should prevent deleting a non-existent task ... ok (15ms)
  should prevent non-owners from deleting tasks ... ok (46ms)
  should reassign task order (move up) ... ok (95ms)
  should reassign task order (move down) ... ok (47ms)
  should prevent assigning order to a non-existent task ... ok (15ms)
  should prevent non-owners from assigning task order ... ok (15ms)
  should prevent assigning an order out of bounds ... ok (30ms)
  should handle no change in order gracefully ... ok (30ms)
  # trace: Principle - Users can create a to-do list, add tasks, and set their ordering. ... ok (221ms)
ListCreationConcept ... ok (1s)
```