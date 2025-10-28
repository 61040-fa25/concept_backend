<concept_spec>

Concept UserAuthentication

Purpose limit access to known users

Principle after a user registers with a username and a password, they can authenticate with that same username and password and be treated each time as the same user

State
  a set of Users with
    an email address String
    a username String
    a password String
    a confirmed flag
  a token String

Actions

  register (username: String, password: String, email: String): (user: User) (token: String)
    requires a unique username
    effects creates a User with the associated username and password. Creates a new token to email the user via a synchronous state and verify their email address. Confirmed is set to false
  confirm (username: String, token: String)
    effects if the token matches the usernames’ associated User, the flag confirmed changes to true else confirmed stays false
  authenticate (username: String, password: String)
    requires User’s confirmed flag must be true and username and password must match internal record for user
    effects if the user is authenticated, they will be treated each time as the same user associated with that username and password. If they are not, they will not proceed Questions

</concept_spec>
