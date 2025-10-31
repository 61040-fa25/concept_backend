<concept_spec>
concept UserAccount
purpose to securely identify and authenticate users
principle a user must register and log in to be identified

state
  a set of Users with
    an email String
    a passwordHash String
    a displayName String

actions
  register (email: String, password: String, displayName: String)
    requires email is not already in use
    effect creates a new user
  login (email: String, password: String)
    effect authenticates the user, creating a session
  updateProfile (user: User, newDisplayName: String)
    effect changes the user's displayName
  deleteAccount (user: User)
    effect removes the user and all their associated data
</concept_spec>