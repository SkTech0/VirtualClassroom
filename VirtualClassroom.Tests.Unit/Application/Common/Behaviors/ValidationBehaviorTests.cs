using FluentValidation;
using MediatR;
using VirtualClassroom.Application.Common.Behaviors;

namespace VirtualClassroom.Tests.Unit.Application.Common.Behaviors;

public sealed class ValidationBehaviorTests
{
    [Fact]
    public async Task Handle_NoValidators_InvokesNext()
    {
        var validators = Array.Empty<IValidator<TestRequest>>();
        var behavior = new ValidationBehavior<TestRequest, TestResponse>(validators);
        var request = new TestRequest("ok");
        var expected = new TestResponse(42);
        RequestHandlerDelegate<TestResponse> next = () => Task.FromResult(expected);

        var result = await behavior.Handle(request, next, CancellationToken.None);

        result.Should().Be(expected);
    }

    [Fact]
    public async Task Handle_ValidRequest_InvokesNext()
    {
        var validator = new TestRequestValidator();
        var validators = new IValidator<TestRequest>[] { validator };
        var behavior = new ValidationBehavior<TestRequest, TestResponse>(validators);
        var request = new TestRequest("valid");
        var expected = new TestResponse(1);
        RequestHandlerDelegate<TestResponse> next = () => Task.FromResult(expected);

        var result = await behavior.Handle(request, next, CancellationToken.None);

        result.Should().Be(expected);
    }

    [Fact]
    public async Task Handle_InvalidRequest_ThrowsValidationException()
    {
        var validator = new TestRequestValidator();
        var validators = new IValidator<TestRequest>[] { validator };
        var behavior = new ValidationBehavior<TestRequest, TestResponse>(validators);
        var request = new TestRequest("");
        RequestHandlerDelegate<TestResponse> next = () => Task.FromResult(new TestResponse(0));

        var act = () => behavior.Handle(request, next, CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>()
            .Where(ex => ex.Errors.Any(e => e.PropertyName == nameof(TestRequest.Value)));
    }

    public record TestRequest(string Value) : IRequest<TestResponse>;
    public record TestResponse(int Id);

    private sealed class TestRequestValidator : AbstractValidator<TestRequest>
    {
        public TestRequestValidator()
        {
            RuleFor(x => x.Value).NotEmpty();
        }
    }
}
