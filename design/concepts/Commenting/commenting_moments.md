# Design Changes

I edited my concept to include a creation date field within the state. This was inspired by Context, which added this field despite my original spec not including so. I believe that this field would be helpful later on when displaying comments under a post, which typically are from most recent to oldest.

I also removed the point about post visibility in my concept as that is not inherently managed by the concept itself. Rather, it will get handled by syncs later on.

Lastly, I made some minor wording changes for clarity.

# Other Issues

The concept preconditions mention things like "user must exist" or "post must exist," although these cannot be handled right now as they will be the job of syncs later.

Besides this, Context overall did fantastic with the implementation of this, but similar to Posting, it had the same compile issues when writing up the test cases. I manually fixed these accordingly. 

I also interestingly found that the way in which Context tried to create a comment and insert it into the database was a bit different from how it tried to create a post and insert that into the database. While I believe that both work, I still found it interesting that Context would do so instead of perhaps having some recognition of question similarity that would in turn produce a similarly formatted response. I did end up modifying Commenting's addComment function to be more similar to the Posting concept just for some consistency and reading ease in the end.