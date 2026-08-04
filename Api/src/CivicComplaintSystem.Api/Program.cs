
var builder = WebApplication.CreateBuilder(args);


builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();


var app = builder.Build();

if (app.Environment.IsDevelopment())
{
   app.UseSwagger();
   
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();