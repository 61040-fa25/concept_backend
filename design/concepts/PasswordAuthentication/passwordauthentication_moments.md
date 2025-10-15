# Changes Made

I did not make any changes to this concept.

# Other Issues

I am aware that plaintext passwords are not practical in a real situation due to security reasons. However, I chose not to focus on implementing this as [Piazza](https://piazza.com/class/melw05erqym3qt/post/155) noted that it's not the biggest priority. Simplicity and safety (bug-wise) seemed a better choice considering that my app involves 4 other concepts that I also have to implement and test already.

In spite of this though, I did ask Context how it would theoretically edit my plaintext-version implementation into a hashed version. The details of this [hash-based password authentication](../../../context/design/concepts/PasswordAuthentication/implementation.md/steps/file.dbbf2943.md) have been saved.

On the other hand, when it came to queries, I had to manually ask Context to make queries for checking whether a user existed by ID or username. I figured that these would be important in the future when implementing syncs as my other concepts all have functions with preconditions on a user existing.