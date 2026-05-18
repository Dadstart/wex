using Microsoft.EntityFrameworkCore;

namespace Wex.Server.Data;

public class WexDbContext(DbContextOptions<WexDbContext> options) : DbContext(options)
{
    public DbSet<Transaction> Transactions => Set<Transaction>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Transaction>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id)
                .ValueGeneratedOnAdd();

            entity.Property(e => e.Description)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(e => e.TransactionDate)
                .IsRequired();

            entity.Property(e => e.PurchaseAmount)
                .HasPrecision(18, 2)
                .IsRequired();
        });
    }
}
