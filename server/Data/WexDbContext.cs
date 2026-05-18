using Microsoft.EntityFrameworkCore;

namespace Wex.Server.Data;

public class WexDbContext(DbContextOptions<WexDbContext> options) : DbContext(options)
{
    public DbSet<WeatherForecast> Forecasts => Set<WeatherForecast>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<WeatherForecast>(entity =>
        {
            entity.HasIndex(e => e.Date).IsUnique();
        });
    }
}
