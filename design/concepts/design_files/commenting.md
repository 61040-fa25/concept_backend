# Commenting
## Concept spec
- Originally had commenting separate from posing in assignment 2
- Combined in assignment 3, mostly because my ai augmentation depended on sync
- Will go back to separate concepts for this and future assignments
- Very similar to posting

## implementation
- Did by hand, almost identical to posting, so copy and paste most of implementation from Posting.ts

## testing
- Used Gemini 2.5 flash to generate tests
- First test suite had type errors from incorrect import and type declaration, had Gemini fix
- Gemini "fix" created same error
- Realized most of the problems stemmed from having one big Deno test function with a bunch of steps; refactored to instead just have multiple Deno test functions; Deno.test.beforeEach now also works correctly
- All tests passed
