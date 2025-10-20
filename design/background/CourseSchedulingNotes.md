> You are an expert technical writer and TypeScript developer.
> 
> I have a test file `courseSchedulingConcept.test.ts`. The **actual test output** from running this file is stored in a variable called `TestingOutput`.
> 
> I also have a reference Markdown document called `Testing.md` that documents test results in a specific format. The style, headings, and layout of `Testing.md` must be followed exactly.
> 
> Your task:
> 
> 1. Create a **new Markdown document** based on the `TestingOutput`.
>     
> 2. Format it **exactly like `Testing.md`**, using the same structure, headings, bullet points, and style.
>     
> 3. For **each test**, include detailed information in the following format:
>     
>     1. **Given**: Describe the setup for the test (inputs, stubs, or initial state). This can be inferred from `CourseScheduling.test.ts`.
>         
>     2. **Action**: Show the function calls made during the test, including parameters. Use code blocks.
>         
>     3. **Result**: Show what the test accomplished, including outputs, returned values, or state changes. Use code blocks.
>         
> 4. Include all test results from `TestingOutput`, including failures and diffs, while preserving this detailed "Given / Action / Result" style.
>     
> 5. Ensure the document is **ready-to-use Markdown**, clearly readable, and mirrors the style of `Testing.md` but with detailed information for each test.
>     
> 
> Example format to follow:
> 
> 6. **Given**: An author `authorA` and a respondent `respondentB`.
>     
> 7. **Action**: The author creates a new survey.
>     
>     `LikertSurvey.createSurvey({ author: "authorA", title: "Customer Satisfaction", scaleMin: 1, scaleMax: 5 })`
>     
> 8. **Result**: A new survey is created, and its ID is returned.
>     
>     `{ survey: "survey1" }`
>     
> 9. **Action**: The author adds two questions to the survey.
>     
>     `LikertSurvey.addQuestion({ survey: "survey1", text: "How satisfied are you...?" }) LikertSurvey.addQuestion({ survey: "survey1", text: "How likely are you...?" })`
>     
> 10. **Result**: Two new questions are created, and their IDs are returned.
>     
>     `{ question: "q1" } { question: "q2" }`
>     

> Ensure your Markdown reflects **all tests in `TestingOutput`** with this level of detail for **Given, Action, and Result**.