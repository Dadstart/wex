using Microsoft.EntityFrameworkCore;

namespace Wex.Server.Data;

public static class DbInitializer
{
    public static Task InitializeAsync(WexDbContext db, CancellationToken cancellationToken = default) =>
        db.Database.MigrateAsync(cancellationToken);
}
