using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Wex.Server.Data;
using Wex.Server.Services;

namespace Wex.Server.Tests.Testing;

public sealed class WexWebApplicationFactory : WebApplicationFactory<Program>
{
    private SqliteConnection? _connection;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureServices(services =>
        {
            var dbDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<WexDbContext>));
            if (dbDescriptor is not null)
            {
                services.Remove(dbDescriptor);
            }

            _connection = new SqliteConnection("Data Source=:memory:");
            _connection.Open();

            services.AddDbContext<WexDbContext>(options => options.UseSqlite(_connection));

            services.AddHttpClient<TreasuryExchangeRateService>()
                .ConfigurePrimaryHttpMessageHandler(() => new FakeTreasuryHandler());
        });
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _connection?.Dispose();
        }

        base.Dispose(disposing);
    }
}
