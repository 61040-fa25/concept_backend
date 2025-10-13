# Design Changes

I edited my addEntry and endSession actions to also take in the user as a parameter. The intended functionality is such that only the user that owns the session can add to it or end it.

I also edited my endSession action to include the additional condition of, the session must be active.

# Other Issues

None; implementation and test writing was rather smooth. I noticed that Context handled errors a bit differently than how it did for the other concept implementations; here, it created a new helper function to check if the return result of a function was an error or not. This helped Context avoid the compiling issues that I saw for the Posting concept.

